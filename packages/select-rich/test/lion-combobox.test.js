import '@lion/option/lion-option.js';
import { expect, fixture, html } from '@open-wc/testing';
import '../lion-combobox.js';
import './keyboardEventShimIE.js';
import { LionComboboxInvoker } from '../src/LionComboboxInvoker.js';
import { LionOptions } from '../src/LionOptions.js';

function mimicUserTyping(el, value) {
  el._overlayInvokerNode.dispatchEvent(new Event('focusin', { bubbles: true }));
  // el._
  // eslint-disable-next-line no-param-reassign
  el._comboboxTextNode.value = value;
  el._comboboxTextNode.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
}

function getFilteredOptionValues(el) {
  const options = el.formElements;
  const filtered = options.filter(option => option.style.display !== 'none');
  return filtered.map(option => option.value);
}

async function fruitFixture({ autocomplete, matchMode }) {
  // TODO: use spread directive for props
  const el = await fixture(html`
    <lion-combobox name="foo">
      <lion-option value="Artichoke">Artichoke</lion-option>
      <lion-option value="Chard">Chard</lion-option>
      <lion-option value="Chicory">Chicory</lion-option>
      <lion-option value="Victoria Plum">Victoria Plum</lion-option>
    </lion-combobox>
  `);
  if (autocomplete) {
    el.autocomplete = autocomplete;
  }
  if (matchMode) {
    el.matchMode = matchMode;
  }
  await el.updateComplete;
  return [el, el.formEelements];
}

describe.skip('lion-combobox', () => {
  describe('Structure', () => {
    it('has a listbox node', async () => {
      const el = await fixture(html`
        <lion-combobox name="foo">
          <lion-option value="10" checked>Item 1</lion-option>
          <lion-option value="20">Item 2</lion-option>
        </lion-combobox>
      `);
      expect(el._listboxNode).to.exist;
      expect(el._listboxNode).to.be.instanceOf(LionOptions);
    });

    it('has an LionComboboxInvoker component', async () => {
      const el = await fixture(html`
        <lion-combobox name="foo">
          <lion-option value="10" checked>Item 1</lion-option>
          <lion-option value="20">Item 2</lion-option>
        </lion-combobox>
      `);
      expect(el._comboboxNode).to.exist;
      expect(el._comboboxNode).to.be.instanceOf(LionComboboxInvoker);
    });
  });

  describe('Listbox visibility', () => {
    it('shows listbox on focusin', async () => {
      const el = await fixture(html`
        <lion-combobox name="foo" multiple-choice>
          <lion-option value="Artichoke">Artichoke</lion-option>
          <lion-option value="Chard">Chard</lion-option>
          <lion-option value="Chicory">Chicory</lion-option>
          <lion-option value="Victoria Plum">Victoria Plum</lion-option>
        </lion-combobox>
      `);
      await el.updateComplete;

      expect(el.opened).to.equal(false);
      el._comboboxNode.dispatchEvent(new Event('focusin', { bubbles: true, composed: true }));
      await el.updateComplete;
      expect(el.opened).to.equal(true);
    });

    it('keeps showing listbox after select', async () => {
      /**
       * Scenario:
       * [1] user focuses textbox and listbox shows
       * [2] user selects "Artichocke": listbox closes, textbox gets value "Artichocke" and textbox has still focus
       * [3] user changes textbox value to "Artichok": the listbox should show again
       */
      const el = await fixture(html`
        <lion-combobox name="foo" multiple-choice>
          <lion-option value="Artichoke">Artichoke</lion-option>
          <lion-option value="Chard">Chard</lion-option>
          <lion-option value="Chicory">Chicory</lion-option>
          <lion-option value="Victoria Plum">Victoria Plum</lion-option>
        </lion-combobox>
      `);
      const options = el.formElements;
      await el.updateComplete;
      expect(el.opened).to.equal(false);

      // step [1]
      el._comboboxNode.dispatchEvent(new Event('focusin', { bubbles: true, composed: true }));
      await el.updateComplete;
      expect(el.opened).to.equal(true);

      // step [2]
      options[0].click();
      await el.updateComplete;
      expect(el.opened).to.equal(false);

      // step [3]
      el._comboboxNode.dispatchEvent(new Event('keydown', { bubbles: true, composed: true }));
      await el.updateComplete;
      expect(el.opened).to.equal(true);
    });
  });

  // Notice that the LionComboboxInvoker always needs to be used in conjunction with the
  // LionCombobox, and therefore will be tested integrated,
  describe('Invoker component integration', () => {
    it('has a textbox', async () => {
      const el = await fixture(html`
        <lion-combobox name="foo">
          <lion-option value="10" checked>Item 1</lion-option>
          <lion-option value="20">Item 2</lion-option>
        </lion-combobox>
      `);
      const invokerEl = el._comboboxNode;
      expect(invokerEl.getAttribute('role')).to.equal('combobox');
    });

    describe('Accessibility', () => {
      it('sets role="combobox" on textbox wrapper/listbox sibling', async () => {
        const el = await fixture(html`
          <lion-combobox name="foo">
            <lion-option value="10" checked>Item 1</lion-option>
            <lion-option value="20">Item 2</lion-option>
          </lion-combobox>
        `);
        expect(el._comboboxNode.getAttribute('role')).to.equal('combobox');
      });

      it('makes sure listbox node is not focusable', async () => {
        const el = await fixture(html`
          <lion-combobox name="foo">
            <lion-option value="10" checked>Item 1</lion-option>
            <lion-option value="20">Item 2</lion-option>
          </lion-combobox>
        `);
        expect(el._listboxNode.hasAttribute('tabindex')).to.be.false;
      });
    });
  });

  describe('Autocompletion', () => {
    it('has autocomplete "both" by default', async () => {
      const el = await fixture(html`
        <lion-combobox name="foo">
          <lion-option value="10" checked>Item 1</lion-option>
        </lion-combobox>
      `);
      expect(el.autocomplete).to.equal('both');
    });

    it('filters options when autocomplete is "both"', async () => {
      const el = await fixture(html`
        <lion-combobox name="foo" autocomplete="both">
          <lion-option value="Artichoke">Artichoke</lion-option>
          <lion-option value="Chard">Chard</lion-option>
          <lion-option value="Chicory">Chicory</lion-option>
          <lion-option value="Victoria Plum">Victoria Plum</lion-option>
        </lion-combobox>
      `);
      mimicUserTyping(el, 'ch');
      expect(getFilteredOptionValues(el)).to.eql(['Artichoke', 'Chard', 'Chicory']);
    });

    it('completes textbox when autocomplete is "both"', async () => {
      const el = await fixture(html`
        <lion-combobox name="foo" autocomplete="both">
          <lion-option value="Artichoke">Artichoke</lion-option>
          <lion-option value="Chard">Chard</lion-option>
          <lion-option value="Chicory">Chicory</lion-option>
          <lion-option value="Victoria Plum">Victoria Plum</lion-option>
        </lion-combobox>
      `);
      mimicUserTyping(el, 'ch');
      expect(el._comboboxTextNode.value).to.equal('Chard');
      expect(el._comboboxTextNode.selectionStart).to.equal(2);
      expect(el._comboboxTextNode.selectionEnd).to.equal(el._comboboxTextNode.value.length);

      // We don't autocomplete when characters are removed
      mimicUserTyping(el, 'c'); // The user pressed backspace (number of chars decreased)
      expect(el._comboboxTextNode.value).to.equal('c');
      expect(el._comboboxTextNode.selectionStart).to.equal(el._comboboxTextNode.value.length);
    });

    it('filters options when autocomplete is "list"', async () => {
      const el = await fixture(html`
        <lion-combobox name="foo" autocomplete="list">
          <lion-option value="Artichoke">Artichoke</lion-option>
          <lion-option value="Chard">Chard</lion-option>
          <lion-option value="Chicory">Chicory</lion-option>
          <lion-option value="Victoria Plum">Victoria Plum</lion-option>
        </lion-combobox>
      `);
      mimicUserTyping(el, 'ch');
      expect(getFilteredOptionValues(el)).to.eql(['Artichoke', 'Chard', 'Chicory']);
      expect(el._comboboxTextNode.value).to.equal('ch');
    });

    it('does not filter options when autocomplete is "none"', async () => {
      const el = await fixture(html`
        <lion-combobox name="foo" autocomplete="none">
          <lion-option value="Artichoke">Artichoke</lion-option>
          <lion-option value="Chard">Chard</lion-option>
          <lion-option value="Chicory">Chicory</lion-option>
          <lion-option value="Victoria Plum">Victoria Plum</lion-option>
        </lion-combobox>
      `);
      mimicUserTyping(el, 'ch');
      expect(getFilteredOptionValues(el)).to.eql([
        'Artichoke',
        'Chard',
        'Chicory',
        'Victoria Plum',
      ]);
    });

    describe('Accessibility', () => {
      it('synchronizes autocomplete option to textbox', async () => {
        let el;

        [el] = await fruitFixture({ autocomplete: 'both' });
        expect(el._comboboxTextNode.getAttribute('aria-autocomplete')).to.equal('both');

        [el] = await fruitFixture({ autocomplete: 'list' });
        expect(el._comboboxTextNode.getAttribute('aria-autocomplete')).to.equal('list');

        [el] = await fruitFixture({ autocomplete: 'none' });
        expect(el._comboboxTextNode.getAttribute('aria-autocomplete')).to.equal('none');
      });

      it('updates aria-activedescendant on textbox node', async () => {
        let el;
        let options;

        [el, options] = await fruitFixture({ autocomplete: 'none' });
        mimicUserTyping(el, 'ch');
        expect(el._comboboxTextNode.getAttribute('aria-activedescendant')).to.equal('');
        expect(options[0].active).to.equal(false);

        [el, options] = await fruitFixture({ autocomplete: 'both' });
        mimicUserTyping(el, 'ch');
        expect(el._comboboxTextNode.getAttribute('aria-activedescendant')).to.equal(options[0].id);
        expect(options[1].active).to.equal(true);

        el.autocomplete = 'list';
        mimicUserTyping(el, 'ch');
        expect(el._comboboxTextNode.getAttribute('aria-activedescendant')).to.equal(options[0].id);
        expect(options[1].active).to.equal(true);
      });
    });
  });

  // TODO: move parts to ListboxMixin test
  describe('Multiple Choice', () => {
    it('does not uncheck siblings', async () => {
      const el = await fixture(html`
        <lion-combobox name="foo" multiple-choice>
          <lion-option value="Artichoke">Artichoke</lion-option>
          <lion-option value="Chard">Chard</lion-option>
          <lion-option value="Chicory">Chicory</lion-option>
          <lion-option value="Victoria Plum">Victoria Plum</lion-option>
        </lion-combobox>
      `);
      const options = el.formElements;
      options[0].checked = true;
      options[1].checked = true;
      expect(options[0].checked).to.equal(true);
      expect(el.modelValue).to.eql(['Artichoke', 'Chard']);
    });

    it('does not close listbox on click/enter/space', async () => {
      const el = await fixture(html`
        <lion-combobox name="foo" multiple-choice>
          <lion-option value="Artichoke">Artichoke</lion-option>
          <lion-option value="Chard">Chard</lion-option>
          <lion-option value="Chicory">Chicory</lion-option>
          <lion-option value="Victoria Plum">Victoria Plum</lion-option>
        </lion-combobox>
      `);

      // activate opened listbox
      mimicUserTyping(el, 'ch');
      await el.updateComplete;
      expect(el.opened).to.equal(true);
      const visibleOptions = el.formElements.filter(o => o.style.display !== 'none');
      visibleOptions[0].click();
      expect(el.opened).to.equal(true);
      // visibleOptions[1].dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
      // expect(el.opened).to.equal(true);
      // visibleOptions[2].dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));
      // expect(el.opened).to.equal(true);
    });

    // TODO: move to LionComboboxInvoker test
    describe('Selected chips display', () => {
      it('displays chips next to textbox, ordered based on user selection', async () => {
        const el = await fixture(html`
          <lion-combobox name="foo" multiple-choice>
            <lion-option value="Artichoke">Artichoke</lion-option>
            <lion-option value="Chard">Chard</lion-option>
            <lion-option value="Chicory">Chicory</lion-option>
            <lion-option value="Victoria Plum">Victoria Plum</lion-option>
          </lion-combobox>
        `);
        const options = el.formElements;
        options[2].checked = true; // Chicory
        options[0].checked = true; // Artichoke
        options[1].checked = true; // Chard
        const chips = Array.from(el._comboboxNode.querySelectorAll('.selection-chip'));
        expect(chips.map(elm => elm.textContent)).to.eql(['Chicory', 'Artichoke', 'Chard']);
        expect(el._comboboxNode.selectedElements).to.eql([options[2], options[0], options[1]]);
      });

      it('stages deletable chips on [Backspace]', async () => {
        const el = await fixture(html`
          <lion-combobox name="foo" multiple-choice>
            <lion-option value="Artichoke">Artichoke</lion-option>
            <lion-option value="Chard">Chard</lion-option>
            <lion-option value="Chicory">Chicory</lion-option>
          </lion-combobox>
        `);
        const options = el.formElements;
        options[0].checked = true; // Artichoke
        options[1].checked = true; // Chard

        expect(el._comboboxNode.removeChipOnNextBackspace).to.be.false;

        el._comboboxTextNode.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
        expect(el._comboboxNode.removeChipOnNextBackspace).to.be.true;

        el._comboboxTextNode.blur();
        expect(el._comboboxNode.removeChipOnNextBackspace).to.be.false;
      });

      it('deletes staged chip on [Backspace]', async () => {
        const el = await fixture(html`
          <lion-combobox name="foo" multiple-choice>
            <lion-option value="Artichoke">Artichoke</lion-option>
            <lion-option value="Chard">Chard</lion-option>
            <lion-option value="Chicory">Chicory</lion-option>
          </lion-combobox>
        `);
        const options = el.formElements;
        options[0].checked = true; // Artichoke
        options[1].checked = true; // Chard

        expect(el._comboboxNode.selectedElements).to.eql([options[0], options[1]]);
        expect(el._comboboxNode.removeChipOnNextBackspace).to.be.false;

        el._comboboxTextNode.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
        expect(el._comboboxNode.selectedElements).to.eql([options[0], options[1]]);
        expect(el._comboboxNode.removeChipOnNextBackspace).to.be.true;

        el._comboboxTextNode.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
        expect(el._comboboxNode.selectedElements).to.eql([options[0]]);
        expect(el._comboboxNode.removeChipOnNextBackspace).to.be.true;

        el._comboboxTextNode.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
        expect(el._comboboxNode.selectedElements).to.eql([]);
        expect(el._comboboxNode.removeChipOnNextBackspace).to.be.true;

        el._comboboxTextNode.blur();
        expect(el._comboboxNode.removeChipOnNextBackspace).to.be.false;
      });
    });

    describe('Accessibility', () => {
      it('adds aria-multiselectable="true" to listbox node', async () => {
        const el = await fixture(html`
          <lion-combobox name="foo" multiple-choice>
            <lion-option value="Artichoke">Artichoke</lion-option>
            <lion-option value="Chard">Chard</lion-option>
          </lion-combobox>
        `);
        expect(el._listboxNode.getAttribute('aria-multiselectable')).to.equal('true');
      });
      it('does not allow "selectionFollowsFocus"', async () => {
        const el = await fixture(html`
          <lion-combobox name="foo" multiple-choice>
            <lion-option checked value="Artichoke">Artichoke</lion-option>
            <lion-option value="Chard">Chard</lion-option>
          </lion-combobox>
        `);
        el._comboboxTextNode.focus();
        el._listboxNode.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown' }));
        expect(el._listboxNode.getAttribute('aria-multiselectable')).to.equal('true');
      });
    });
  });

  //
  describe('Match Mode', () => {
    it('has a default value of "all"', async () => {
      const [el] = await fruitFixture();
      expect(el.matchMode).to.equal('all');
    });

    it('will suggest partial (in the middle of the word) when "all"', async () => {
      const [el] = await fruitFixture();
      mimicUserTyping(el, 'ch');
      expect(getFilteredOptionValues(el)).to.eql([
        'Artichoke',
        'Chard',
        'Chicory',
        'Victoria Plum',
      ]);
    });

    it('will only suggest beginning matches when "begin"', async () => {
      const [el] = await fruitFixture({ matchMode: 'begin' });
      mimicUserTyping(el, 'ch');
      expect(getFilteredOptionValues(el)).to.eql(['Chard', 'Chicory']);
    });

    it('allows for custom matching functions', async () => {
      const [el] = await fruitFixture();
      function onlyExactMatches(option, curValue) {
        return option.value === curValue;
      }
      el.filterOptionCondition = onlyExactMatches;
      mimicUserTyping(el, 'Chicory');
      expect(getFilteredOptionValues(el)).to.eql(['Chicory']);
      mimicUserTyping(el, 'Chicor');
      expect(getFilteredOptionValues(el)).to.eql([]);
    });
  });

  // TODO: move to ListboxMixin tests
  describe('Orientation', () => {
    it('has a default value of "vertical"', async () => {
      const el = await fixture(html`
        <lion-combobox name="foo" orientation="horizontal">
          <lion-option value="Artichoke">Artichoke</lion-option>
          <lion-option value="Chard">Chard</lion-option>
        </lion-combobox>
      `);
      const options = el.formElements;
      el._comboboxTextNode.focus();

      el.activeIndex = 0;
      el._listboxNode.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown' }));
      expect(options[0].active).to.be.false;
      expect(options[1].active).to.be.true;

      el.activeIndex = 1;
      el._listboxNode.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));
      expect(options[0].active).to.be.true;
      expect(options[1].active).to.be.false;

      // No response to horizontal arrows...

      el.activeIndex = 0;
      el._listboxNode.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
      expect(options[0].active).to.be.true;
      expect(options[1].active).to.be.false;

      el.activeIndex = 1;
      el._listboxNode.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
      expect(options[0].active).to.be.false;
      expect(options[1].active).to.be.true;
    });

    it('uses left and right arrow keys when "horizontal"', async () => {
      const el = await fixture(html`
        <lion-combobox name="foo" orientation="horizontal">
          <lion-option value="Artichoke">Artichoke</lion-option>
          <lion-option value="Chard">Chard</lion-option>
        </lion-combobox>
      `);
      const options = el.formElements;
      el._comboboxTextNode.focus();

      el.activeIndex = 0;
      el._listboxNode.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
      expect(options[0].active).to.be.false;
      expect(options[1].active).to.be.true;

      el.activeIndex = 1;
      el._listboxNode.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
      expect(options[0].active).to.be.true;
      expect(options[1].active).to.be.false;

      // No response to vertical arrows...

      el.activeIndex = 0;
      el._listboxNode.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown' }));
      expect(options[0].active).to.be.true;
      expect(options[1].active).to.be.false;

      el.activeIndex = 1;
      el._listboxNode.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));
      expect(options[0].active).to.be.false;
      expect(options[1].active).to.be.true;
    });

    describe('Accessibility', () => {
      it('adds aria-orientation attribute to listbox node', async () => {
        const el = await fixture(html`
          <lion-combobox name="foo" orientation="horizontal">
            <lion-option checked value="Artichoke">Artichoke</lion-option>
            <lion-option value="Chard">Chard</lion-option>
          </lion-combobox>
        `);
        expect(el._listboxNode.getAttribute('aria-orientation')).to.equal('horizontal');
      });
    });
  });

  // TODO: Move to Listbox
  describe('Selection follows focus', () => {
    it('syncs activate option to checked', async () => {
      const el = await fixture(html`
        <lion-combobox name="foo" selection-follows-focus>
          <lion-option checked value="Artichoke">Artichoke</lion-option>
          <lion-option value="Chard">Chard</lion-option>
        </lion-combobox>
      `);
      const options = el.formElements;
      el._comboboxTextNode.focus();
      el._listboxNode.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown' }));
      expect(options[0].checked).to.be.false;
      expect(options[1].checked).to.be.true;

      el._listboxNode.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));
      expect(options[0].checked).to.be.true;
      expect(options[1].checked).to.be.false;
    });
  });

  // TODO: move to ListboxMixin
  describe('Rotate Navigation', () => {
    it('stops navigation by default at end of option list', async () => {
      const el = await fixture(html`
        <lion-combobox name="foo" rotate-navigation>
          <lion-option value="Artichoke">Artichoke</lion-option>
          <lion-option value="Bla">Bla</lion-option>
          <lion-option value="Chard">Chard</lion-option>
        </lion-combobox>
      `);
      const options = el.formElements;
      el._comboboxTextNode.focus();
      el.activeIndex = 0;
      el._listboxNode.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));
      expect(options[0].active).to.be.true;
      expect(options[1].active).to.be.false;
      expect(options[2].active).to.be.false;

      el.activeIndex = 2;
      el._listboxNode.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown' }));
      expect(options[0].active).to.be.false;
      expect(options[1].active).to.be.false;
      expect(options[2].active).to.be.true;
    });

    it('when "rotate-navigation" provided, selects first option after navigated to next from last and vice versa', async () => {
      const el = await fixture(html`
        <lion-combobox name="foo" rotate-navigation>
          <lion-option checked value="Artichoke">Artichoke</lion-option>
          <lion-option value="Bla">Bla</lion-option>
          <lion-option value="Chard">Chard</lion-option>
        </lion-combobox>
      `);
      const options = el.formElements;
      el._comboboxTextNode.focus();
      el._listboxNode.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));
      expect(options[0].active).to.be.false;
      expect(options[1].active).to.be.false;
      expect(options[2].active).to.be.true;

      el._listboxNode.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown' }));
      expect(options[0].active).to.be.true;
      expect(options[1].active).to.be.false;
      expect(options[2].active).to.be.false;

      // Extra check: regular navigation
      el._listboxNode.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown' }));
      expect(options[0].active).to.be.false;
      expect(options[1].active).to.be.true;
      expect(options[2].active).to.be.false;
    });
  });
});
