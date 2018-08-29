/**
 * Copyright (c) 2017 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { assert, expect } from 'chai';
import { InputHandler } from './InputHandler';
import { MockInputHandlingTerminal } from './utils/TestUtils.test';
import { NULL_CELL_CHAR, NULL_CELL_CODE, NULL_CELL_WIDTH, CHAR_DATA_CHAR_INDEX } from './Buffer';
import { TerminalLine } from './TerminalLine';
import { Terminal } from './Terminal';

describe('InputHandler', () => {
  describe('save and restore cursor', () => {
    const terminal = new MockInputHandlingTerminal();
    terminal.buffer.x = 1;
    terminal.buffer.y = 2;
    terminal.curAttr = 3;
    const inputHandler = new InputHandler(terminal);
    // Save cursor position
    inputHandler.saveCursor([]);
    assert.equal(terminal.buffer.x, 1);
    assert.equal(terminal.buffer.y, 2);
    assert.equal(terminal.curAttr, 3);
    // Change cursor position
    terminal.buffer.x = 10;
    terminal.buffer.y = 20;
    terminal.curAttr = 30;
    // Restore cursor position
    inputHandler.restoreCursor([]);
    assert.equal(terminal.buffer.x, 1);
    assert.equal(terminal.buffer.y, 2);
    assert.equal(terminal.curAttr, 3);
  });
  describe('setCursorStyle', () => {
    it('should call Terminal.setOption with correct params', () => {
      const terminal = new MockInputHandlingTerminal();
      const inputHandler = new InputHandler(terminal);
      const collect = ' ';

      inputHandler.setCursorStyle([0], collect);
      assert.equal(terminal.options['cursorStyle'], 'block');
      assert.equal(terminal.options['cursorBlink'], true);

      terminal.options = {};
      inputHandler.setCursorStyle([1], collect);
      assert.equal(terminal.options['cursorStyle'], 'block');
      assert.equal(terminal.options['cursorBlink'], true);

      terminal.options = {};
      inputHandler.setCursorStyle([2], collect);
      assert.equal(terminal.options['cursorStyle'], 'block');
      assert.equal(terminal.options['cursorBlink'], false);

      terminal.options = {};
      inputHandler.setCursorStyle([3], collect);
      assert.equal(terminal.options['cursorStyle'], 'underline');
      assert.equal(terminal.options['cursorBlink'], true);

      terminal.options = {};
      inputHandler.setCursorStyle([4], collect);
      assert.equal(terminal.options['cursorStyle'], 'underline');
      assert.equal(terminal.options['cursorBlink'], false);

      terminal.options = {};
      inputHandler.setCursorStyle([5], collect);
      assert.equal(terminal.options['cursorStyle'], 'bar');
      assert.equal(terminal.options['cursorBlink'], true);

      terminal.options = {};
      inputHandler.setCursorStyle([6], collect);
      assert.equal(terminal.options['cursorStyle'], 'bar');
      assert.equal(terminal.options['cursorBlink'], false);
    });
  });
  describe('setMode', () => {
    it('should toggle Terminal.bracketedPasteMode', () => {
      const terminal = new MockInputHandlingTerminal();
      const collect = '?';
      terminal.bracketedPasteMode = false;
      const inputHandler = new InputHandler(terminal);
      // Set bracketed paste mode
      inputHandler.setMode([2004], collect);
      assert.equal(terminal.bracketedPasteMode, true);
      // Reset bracketed paste mode
      inputHandler.resetMode([2004], collect);
      assert.equal(terminal.bracketedPasteMode, false);
    });
  });
  describe('regression tests', function(): void {
    type CharData = [number, string, number, number];

    function lineContent(line: TerminalLine): string {
      let content = '';
      for (let i = 0; i < line.length; ++i) content += line.get(i)[CHAR_DATA_CHAR_INDEX];
      return content;
    }

    function termContent(term: Terminal): string[] {
      const result = [];
      for (let i = 0; i < term.rows; ++i) result.push(lineContent(term.buffer.lines.get(i)));
      return result;
    }

    it('insertChars', function() {
      const term = new Terminal();
      const inputHandler = new InputHandler(term);

      // old variant of the method
      function insertChars(params: number[]): void {
        let param = params[0];
        if (param < 1) param = 1;
    
        // make buffer local for faster access
        const buffer = term.buffer;
    
        const row = buffer.y + buffer.ybase;
        let j = buffer.x;
        const ch: CharData = [term.eraseAttr(), NULL_CELL_CHAR, NULL_CELL_WIDTH, NULL_CELL_CODE]; // xterm
        while (param-- && j < term.cols) {
          buffer.lines.get(row).splice(j++, 0, ch);
          buffer.lines.get(row).pop();
        }
      }

      // insert some data in first and second line
      inputHandler.parse(Array(term.cols - 9).join("a"));
      inputHandler.parse('1234567890');
      inputHandler.parse(Array(term.cols - 9).join("a"));
      inputHandler.parse('1234567890');
      const line1: TerminalLine = term.buffer.lines.get(0); // line for old variant
      const line2: TerminalLine = term.buffer.lines.get(1); // line for new variant
      expect(lineContent(line1)).equals(Array(term.cols - 9).join("a") + '1234567890');
      expect(lineContent(line2)).equals(Array(term.cols - 9).join("a") + '1234567890');
      
      // insert one char from params = [0]
      term.buffer.y = 0;
      term.buffer.x = 70;
      insertChars([0]);
      expect(lineContent(line1)).equals(Array(term.cols - 9).join("a") + ' 123456789');
      term.buffer.y = 1;
      term.buffer.x = 70;
      inputHandler.insertChars([0]);
      expect(lineContent(line2)).equals(Array(term.cols - 9).join("a") + ' 123456789');
      expect(lineContent(line2)).equals(lineContent(line1));

      // insert one char from params = [1]
      term.buffer.y = 0;
      term.buffer.x = 70;
      insertChars([1]);
      expect(lineContent(line1)).equals(Array(term.cols - 9).join("a") + '  12345678');
      term.buffer.y = 1;
      term.buffer.x = 70;
      inputHandler.insertChars([1]);
      expect(lineContent(line2)).equals(Array(term.cols - 9).join("a") + '  12345678');
      expect(lineContent(line2)).equals(lineContent(line1));

      // insert two chars from params = [2]
      term.buffer.y = 0;
      term.buffer.x = 70;
      insertChars([2]);
      expect(lineContent(line1)).equals(Array(term.cols - 9).join("a") + '    123456');
      term.buffer.y = 1;
      term.buffer.x = 70;
      inputHandler.insertChars([2]);
      expect(lineContent(line2)).equals(Array(term.cols - 9).join("a") + '    123456');
      expect(lineContent(line2)).equals(lineContent(line1));

      // insert 10 chars from params = [10]
      term.buffer.y = 0;
      term.buffer.x = 70;
      insertChars([10]);
      expect(lineContent(line1)).equals(Array(term.cols - 9).join("a") + '          ');
      term.buffer.y = 1;
      term.buffer.x = 70;
      inputHandler.insertChars([10]);
      expect(lineContent(line2)).equals(Array(term.cols - 9).join("a") + '          ');
      expect(lineContent(line2)).equals(lineContent(line1));
    });
    it('deleteChars', function(): void {
      const term = new Terminal();
      const inputHandler = new InputHandler(term);

      // old variant of the method
      function deleteChars(params: number[]): void {
        let param: number = params[0];
        if (param < 1) {
          param = 1;
        }
    
        // make buffer local for faster access
        const buffer = term.buffer;
    
        const row = buffer.y + buffer.ybase;
        const ch: CharData = [term.eraseAttr(), NULL_CELL_CHAR, NULL_CELL_WIDTH, NULL_CELL_CODE]; // xterm
        while (param--) {
          buffer.lines.get(row).splice(buffer.x, 1);
          buffer.lines.get(row).push(ch);
        }
        term.updateRange(buffer.y);
      }

      // insert some data in first and second line
      inputHandler.parse(Array(term.cols - 9).join("a"));
      inputHandler.parse('1234567890');
      inputHandler.parse(Array(term.cols - 9).join("a"));
      inputHandler.parse('1234567890');
      const line1: TerminalLine = term.buffer.lines.get(0); // line for old variant
      const line2: TerminalLine = term.buffer.lines.get(1); // line for new variant
      expect(lineContent(line1)).equals(Array(term.cols - 9).join("a") + '1234567890');
      expect(lineContent(line2)).equals(Array(term.cols - 9).join("a") + '1234567890');

      // delete one char from params = [0]
      term.buffer.y = 0;
      term.buffer.x = 70;
      deleteChars([0]);
      expect(lineContent(line1)).equals(Array(term.cols - 9).join("a") + '234567890 ');
      term.buffer.y = 1;
      term.buffer.x = 70;
      inputHandler.deleteChars([0]);
      expect(lineContent(line2)).equals(Array(term.cols - 9).join("a") + '234567890 ');
      expect(lineContent(line2)).equals(lineContent(line1));

      // insert one char from params = [1]
      term.buffer.y = 0;
      term.buffer.x = 70;
      deleteChars([1]);
      expect(lineContent(line1)).equals(Array(term.cols - 9).join("a") + '34567890  ');
      term.buffer.y = 1;
      term.buffer.x = 70;
      inputHandler.deleteChars([1]);
      expect(lineContent(line2)).equals(Array(term.cols - 9).join("a") + '34567890  ');
      expect(lineContent(line2)).equals(lineContent(line1));

      // insert two chars from params = [2]
      term.buffer.y = 0;
      term.buffer.x = 70;
      deleteChars([2]);
      expect(lineContent(line1)).equals(Array(term.cols - 9).join("a") + '567890    ');
      term.buffer.y = 1;
      term.buffer.x = 70;
      inputHandler.deleteChars([2]);
      expect(lineContent(line2)).equals(Array(term.cols - 9).join("a") + '567890    ');
      expect(lineContent(line2)).equals(lineContent(line1));

      // insert 10 chars from params = [10]
      term.buffer.y = 0;
      term.buffer.x = 70;
      deleteChars([10]);
      expect(lineContent(line1)).equals(Array(term.cols - 9).join("a") + '          ');
      term.buffer.y = 1;
      term.buffer.x = 70;
      inputHandler.deleteChars([10]);
      expect(lineContent(line2)).equals(Array(term.cols - 9).join("a") + '          ');
      expect(lineContent(line2)).equals(lineContent(line1));
    });
    it('eraseInLine', function(): void {
      const term = new Terminal();
      const inputHandler = new InputHandler(term);

      function eraseInLine(params: number[]): void {
        switch (params[0]) {
          case 0:
            term.eraseRight(term.buffer.x, term.buffer.y);
            break;
          case 1:
            term.eraseLeft(term.buffer.x, term.buffer.y);
            break;
          case 2:
            term.eraseLine(term.buffer.y);
            break;
        }
      }

      // fill 6 lines to test 3 different states
      inputHandler.parse(Array(term.cols + 1).join("a"));
      inputHandler.parse(Array(term.cols + 1).join("a"));
      inputHandler.parse(Array(term.cols + 1).join("a"));
      inputHandler.parse(Array(term.cols + 1).join("a"));
      inputHandler.parse(Array(term.cols + 1).join("a"));
      inputHandler.parse(Array(term.cols + 1).join("a"));

      // params[0] - right erase
      term.buffer.y = 0;
      term.buffer.x = 70;
      eraseInLine([0]);
      expect(lineContent(term.buffer.lines.get(0))).equals(Array(71).join("a") + '          ');
      term.buffer.y = 1;
      term.buffer.x = 70;
      inputHandler.eraseInLine([0]);
      expect(lineContent(term.buffer.lines.get(1))).equals(Array(71).join("a") + '          ');

      // params[1] - left erase
      term.buffer.y = 2;
      term.buffer.x = 70;
      eraseInLine([1]);
      expect(lineContent(term.buffer.lines.get(2))).equals(Array(71).join(" ") + ' aaaaaaaaa');
      term.buffer.y = 3;
      term.buffer.x = 70;
      inputHandler.eraseInLine([1]);
      expect(lineContent(term.buffer.lines.get(3))).equals(Array(71).join(" ") + ' aaaaaaaaa');

      // params[1] - left erase
      term.buffer.y = 4;
      term.buffer.x = 70;
      eraseInLine([2]);
      expect(lineContent(term.buffer.lines.get(4))).equals(Array(term.cols + 1).join(" "));
      term.buffer.y = 5;
      term.buffer.x = 70;
      inputHandler.eraseInLine([2]);
      expect(lineContent(term.buffer.lines.get(5))).equals(Array(term.cols + 1).join(" "));

    });
    it('eraseInDisplay', function(): void {
      const termOld = new Terminal();
      const inputHandlerOld = new InputHandler(termOld);
      const termNew = new Terminal();
      const inputHandlerNew = new InputHandler(termNew);

      function eraseInDisplay(params: number[]): void {
        let j;
        switch (params[0]) {
          case 0:
          termOld.eraseRight(termOld.buffer.x, termOld.buffer.y);
            j = termOld.buffer.y + 1;
            for (; j < termOld.rows; j++) {
              termOld.eraseLine(j);
            }
            break;
          case 1:
            termOld.eraseLeft(termOld.buffer.x, termOld.buffer.y);
            j = termOld.buffer.y;
            while (j--) {
              termOld.eraseLine(j);
            }
            break;
          case 2:
            j = termOld.rows;
            while (j--) termOld.eraseLine(j);
            break;
          case 3:
            // Clear scrollback (everything not in viewport)
            const scrollBackSize = termOld.buffer.lines.length - termOld.rows;
            if (scrollBackSize > 0) {
              termOld.buffer.lines.trimStart(scrollBackSize);
              termOld.buffer.ybase = Math.max(termOld.buffer.ybase - scrollBackSize, 0);
              termOld.buffer.ydisp = Math.max(termOld.buffer.ydisp - scrollBackSize, 0);
              // Force a scroll event to refresh viewport
              termOld.emit('scroll', 0);
            }
            break;
        }
      }

      // fill display with a's
      for (let i = 0; i < termOld.rows; ++i) inputHandlerOld.parse(Array(termOld.cols + 1).join("a"));
      for (let i = 0; i < termNew.rows; ++i) inputHandlerNew.parse(Array(termOld.cols + 1).join("a"));
      const data = [];
      for (let i = 0; i < termOld.rows; ++i) data.push(Array(termOld.cols + 1).join("a"));
      expect(termContent(termOld)).eql(data);
      expect(termContent(termOld)).eql(termContent(termNew));

      // params [0] - right and below erase
      termOld.buffer.y = 5;
      termOld.buffer.x = 40;
      eraseInDisplay([0]);
      termNew.buffer.y = 5;
      termNew.buffer.x = 40;
      inputHandlerNew.eraseInDisplay([0]);
      expect(termContent(termNew)).eql(termContent(termOld));

      // reset
      termOld.buffer.y = 0;
      termOld.buffer.x = 0;
      termNew.buffer.y = 0;
      termNew.buffer.x = 0;
      for (let i = 0; i < termOld.rows; ++i) inputHandlerOld.parse(Array(termOld.cols + 1).join("a"));
      for (let i = 0; i < termNew.rows; ++i) inputHandlerNew.parse(Array(termOld.cols + 1).join("a"));

      // params [1] - left and above
      termOld.buffer.y = 5;
      termOld.buffer.x = 40;
      eraseInDisplay([1]);
      termNew.buffer.y = 5;
      termNew.buffer.x = 40;
      inputHandlerNew.eraseInDisplay([1]);
      expect(termContent(termNew)).eql(termContent(termOld));

      // reset
      termOld.buffer.y = 0;
      termOld.buffer.x = 0;
      termNew.buffer.y = 0;
      termNew.buffer.x = 0;
      for (let i = 0; i < termOld.rows; ++i) inputHandlerOld.parse(Array(termOld.cols + 1).join("a"));
      for (let i = 0; i < termNew.rows; ++i) inputHandlerNew.parse(Array(termOld.cols + 1).join("a"));

      // params [2] - whole screen
      termOld.buffer.y = 5;
      termOld.buffer.x = 40;
      eraseInDisplay([2]);
      termNew.buffer.y = 5;
      termNew.buffer.x = 40;
      inputHandlerNew.eraseInDisplay([2]);
      expect(termContent(termNew)).eql(termContent(termOld));
    });
  });
});
