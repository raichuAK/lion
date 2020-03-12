import { ChoiceGroupMixin } from '@lion/choice-input';
import { css, html, dedupeMixin, SlotMixin } from '@lion/core';
import { FormRegistrarMixin } from '@lion/field';
import './differentKeyNamesShimIE.js';
import '../lion-options.js';

function uuid() {
  return Math.random()
    .toString(36)
    .substr(2, 10);
}

function detectInteractionMode() {
  if (navigator.appVersion.indexOf('Mac') !== -1) {
    return 'mac';
  }
  return 'windows/linux';
}

function isInView(container, element, partial = false) {
  const cTop = container.scrollTop;
  const cBottom = cTop + container.clientHeight;
  const eTop = element.offsetTop;
  const eBottom = eTop + element.clientHeight;
  const isTotal = eTop >= cTop && eBottom <= cBottom;
  let isPartial;

  if (partial === true) {
    isPartial = (eTop < cTop && eBottom > cTop) || (eBottom > cBottom && eTop < cBottom);
  } else if (typeof partial === 'number') {
    if (eTop < cTop && eBottom > cTop) {
      isPartial = ((eBottom - cTop) * 100) / element.clientHeight > partial;
    } else if (eBottom > cBottom && eTop < cBottom) {
      isPartial = ((cBottom - eTop) * 100) / element.clientHeight > partial;
    }
  }
  return isTotal || isPartial;
}

export const ListboxMixin = dedupeMixin(
  superclass =>
    // eslint-disable-next-line no-shadow, no-unused-vars
    class ListboxMixin extends ChoiceGroupMixin(FormRegistrarMixin(SlotMixin(superclass))) {
      static get properties() {
        return {
          disabled: {
            type: Boolean,
            reflect: true,
          },
          /**
           * @desc A Boolean attribute which, if present, indicates that the user should not be able to edit
           * the value of the input. The difference between disabled and readonly is that read-only
           * controls can still function, whereas disabled controls generally do not function as
           * controls until they are enabled.
           * (From: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-readonly)
           */
          readOnly: {
            type: Boolean,
            reflect: true,
            attribute: 'readonly',
          },
          /**
           * @desc Informs screenreader and affects keyboard navigation.
           * By default 'vertical'
           * @type {'vertical'|'horizontal'}
           */
          orientation: String,
          /**
           * @desc When true, will synchronize activedescendant and selected element on
           * arrow key navigation.
           * This behavior can usually be seen on <select> on the Windows polatform.
           * Note that this behavior cannot be used when multiple-choice is true.
           * See: https://www.w3.org/TR/wai-aria-practices/#kbd_selection_follows_focus
           */
          selectionFollowsFocus: {
            type: Boolean,
            attribute: 'selection-follows-focus',
          },
          /**
           * @desc Will give first option active state when navigated to the next option from
           * last option.
           */
          rotateKeyboardNavigation: {
            type: Boolean,
            attribute: 'rotate-keyboard-navigation',
          },
          // TODO: move to RichSelect
          /**
           * @desc Aligns behavior for 'selectionFollowFocus' and 'navigateFromInvoker' with
           * platform. When 'auto' (default), platform is automatically detected
           * @type {'windows/linux'|'mac'\'auto'}
           */
          interactionMode: {
            type: String,
            attribute: 'interaction-mode',
          },
        };
      }

      // eslint-disable-next-line class-methods-use-this
      get slots() {
        return {
          ...super.slots,
          input: () => {
            const listboxNode = document.createElement('lion-options');
            listboxNode.registrationTarget = this;
            return listboxNode;
          },
        };
      }

      static get styles() {
        return [
          css`
            :host {
              display: block;
            }

            :host([disabled]) {
              color: #adadad;
            }
          `,
        ];
      }

      get _listboxNode() {
        return this._inputNode;
      }

      get _listboxActiveDescendantNode() {
        return this._listboxNode.querySelector(`#${this._listboxActiveDescendant}`);
      }

      get _scrollTargetNode() {
        return this;
      }

      get checkedIndex() {
        const options = this.formElements;
        if (!this.multipleChoice) {
          return options.indexOf(options.find(o => o.checked));
        }
        return options.filter(o => o.checked).map(o => options.indexOf(o));
      }

      _handleCheckedIndex(index) {
        if (this._listboxNode.children[index]) {
          if (!this.multipleChoice) {
            this._listboxNode.children[index].checked = true;
          } else {
            this._listboxNode.children[index].checked = !this._listboxNode.children[index].checked;
          }
        }
      }

      get activeIndex() {
        return this.formElements.findIndex(el => el.active === true);
      }

      set activeIndex(index) {
        if (this.formElements[index]) {
          const el = this.formElements[index];
          el.active = true;

          if (!isInView(this._scrollTargetNode, el)) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }

      constructor() {
        super();
        this.interactionMode = 'auto';
        this.disabled = false;
        this.orientation = 'vertical';

        // for interaction states
        this._listboxActiveDescendant = null;
        this.__hasInitialSelectedFormElement = false;

        this.__listboxOnClick = this.__listboxOnClick.bind(this);
        this.__listboxOnKeyUp = this.__listboxOnKeyUp.bind(this);
        this.__listboxOnKeyDown = this.__listboxOnKeyDown.bind(this);
      }

      async connectedCallback() {
        if (this._listboxNode) {
          this._listboxNode.registrationTarget = this;
        }
        if (super.connectedCallback) {
          super.connectedCallback();
        }
        this.__setupEventListeners();
        if (!this.__readyForRegistration) {
          await this.registrationReady;
          this.initInteractionState();
        }
      }

      disconnectedCallback() {
        if (super.disconnectedCallback) {
          super.disconnectedCallback();
        }
        this.__teardownEventListeners();
        this.__teardownListboxNode();
      }

      firstUpdated(c) {
        super.firstUpdated(c);
        this.__setupListboxNode();

        // formRegistrarManager.addEventListener('all-forms-open-for-registration', () => {
        //   // Now that we have rendered + registered our listbox, try setting the user defined modelValue again
        //   if (this.__cachedUserSetModelValue) {
        //     console.log('__cachedUserSetModelValue', this.__cachedUserSetModelValue);
        //     this.modelValue = this.__cachedUserSetModelValue;
        //   }
        // });
      }

      _requestUpdate(name, oldValue) {
        super._requestUpdate(name, oldValue);
        if (name === 'interactionMode') {
          if (this.interactionMode === 'auto') {
            this.interactionMode = detectInteractionMode();
          }
        }
      }

      // eslint-disable-next-line class-methods-use-this
      _checkSingleChoiceElements() {}

      updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('disabled')) {
          if (this.disabled) {
            this.__requestOptionsToBeDisabled();
          } else {
            this.__retractRequestOptionsToBeDisabled();
          }
        }
        if (changedProperties.has('modelValue')) {
          this.dispatchEvent(new Event('model-value-changed', { bubbles: true }));
        }
      }

      /**
       * @override
       */
      // eslint-disable-next-line
      _inputGroupInputTemplate() {
        return html`
          <div class="input-group__input">
            <slot name="input"></slot>
            <slot id="options-outlet"></slot>
          </div>
        `;
      }

      /**
       * Overrides FormRegistrar adding to make sure children have specific default states when added
       *
       * @override
       * @param {*} child
       * @param {Number} indexToInsertAt
       */
      addFormElement(child, indexToInsertAt) {
        super.addFormElement(child, indexToInsertAt);

        // we need to adjust the elements being registered
        /* eslint-disable no-param-reassign */
        child.id = child.id || `${this.localName}-option-${uuid()}`;

        if (this.disabled) {
          child.makeRequestToBeDisabled();
        }

        this.__setAttributeForAllFormElements('aria-setsize', this.formElements.length);
        child.setAttribute('aria-posinset', this.formElements.length);

        this.__onChildCheckedChanged({ target: child });
        this.resetInteractionState();
        /* eslint-enable no-param-reassign */
      }

      __setupEventListeners() {
        this.__onChildActiveChanged = this.__onChildActiveChanged.bind(this);
        this.__onChildCheckedChanged = this.__onChildCheckedChanged.bind(this);

        this._listboxNode.addEventListener('active-changed', this.__onChildActiveChanged);

        this.removeEventListener('checked-changed', this.__onChildCheckedChanged);
        // Readd the listener to _listboxNode, so it will still work whn placed in body
        this._listboxNode.addEventListener('checked-changed', this.__onChildCheckedChanged);
        this.addEventListener('keydown', this.__preventScrollingWithArrowKeys);
      }

      __teardownEventListeners() {
        this._listboxNode.removeEventListener('active-changed', this.__onChildActiveChanged);
        this._listboxNode.removeEventListener('checked-changed', this.__onChildCheckedChanged);
        this.removeEventListener('keydown', this.__preventScrollingWithArrowKeys);
      }

      __onChildActiveChanged({ target }) {
        if (target.active === true) {
          this.formElements.forEach(formElement => {
            if (formElement !== target) {
              // eslint-disable-next-line no-param-reassign
              formElement.active = false;
            }
          });
          this._listboxNode.setAttribute('aria-activedescendant', target.id);
        }
      }

      __setAttributeForAllFormElements(attribute, value) {
        this.formElements.forEach(formElement => {
          formElement.setAttribute(attribute, value);
        });
      }

      __onChildCheckedChanged(cfgOrEvent) {
        const { target } = cfgOrEvent;
        if (cfgOrEvent.stopPropagation) {
          cfgOrEvent.stopPropagation();
        }
        if (target.checked) {
          if (!this.multipleChoice) {
            this.formElements.forEach(formElement => {
              if (formElement !== target) {
                // eslint-disable-next-line no-param-reassign
                formElement.checked = false;
              }
            });
          }
        }
        this.requestUpdate('modelValue');
      }

      __getNextEnabledOption(currentIndex, offset = 1) {
        for (let i = currentIndex + offset; i < this.formElements.length; i += 1) {
          if (this.formElements[i] && !this.formElements[i].disabled) {
            return i;
          }
        }
        return currentIndex;
      }

      __getPreviousEnabledOption(currentIndex, offset = -1) {
        for (let i = currentIndex + offset; i >= 0; i -= 1) {
          if (this.formElements[i] && !this.formElements[i].disabled) {
            return i;
          }
        }
        return currentIndex;
      }

      /**
       * @desc
       * Handle various keyboard controls; UP/DOWN will shift focus; SPACE selects
       * an item.
       *
       * @param ev - the keydown event object
       */
      __listboxOnKeyUp(ev) {
        if (this.disabled) {
          return;
        }

        const { key } = ev;

        switch (key) {
          case 'Escape':
            ev.preventDefault();
            this.opened = false;
            break;
          case 'Enter':
          case ' ':
            ev.preventDefault();
            if (this.interactionMode === 'mac' || this.multipleChoice) {
              this._handleCheckedIndex(this.activeIndex);
            }
            if (!this.multipleChoice) {
              this.opened = false;
            }
            break;
          case 'ArrowUp':
            if (this.orientation === 'vertical') {
              this.activeIndex = this.__getPreviousEnabledOption(this.activeIndex);
            }
            break;
          case 'ArrowLeft':
            // ev.preventDefault();
            if (this.orientation === 'horizontal') {
              this.activeIndex = this.__getPreviousEnabledOption(this.activeIndex);
            }
            break;
          case 'ArrowDown':
            if (this.orientation === 'vertical') {
              this.activeIndex = this.__getNextEnabledOption(this.activeIndex);
            }
            break;
          case 'ArrowRight':
            if (this.orientation === 'horizontal') {
              this.activeIndex = this.__getNextEnabledOption(this.activeIndex);
            }
            break;
          case 'Home':
            // ev.preventDefault();
            this.activeIndex = this.__getNextEnabledOption(0, 0);
            break;
          case 'End':
            // ev.preventDefault();
            this.activeIndex = this.__getPreviousEnabledOption(this.formElements.length - 1, 0);
            break;
          /* no default */
        }

        const keys = ['ArrowUp', 'ArrowDown', 'Home', 'End'];
        if (
          keys.includes(key) &&
          this.interactionMode === 'windows/linux' &&
          !this.multipleChoice
        ) {
          this._handleCheckedIndex(this.activeIndex);
        }
      }

      __listboxOnKeyDown(ev) {
        if (this.disabled) {
          return;
        }

        const { key } = ev;

        switch (key) {
          case 'Tab':
            // Tab can only be caught in keydown
            // ev.preventDefault();
            this.opened = false;
            break;
          /* no default */
        }
      }

      __requestOptionsToBeDisabled() {
        this.formElements.forEach(el => {
          if (el.makeRequestToBeDisabled) {
            el.makeRequestToBeDisabled();
          }
        });
      }

      __retractRequestOptionsToBeDisabled() {
        this.formElements.forEach(el => {
          if (el.retractRequestToBeDisabled) {
            el.retractRequestToBeDisabled();
          }
        });
      }

      /**
       * For ShadyDom the listboxNode is available right from the start so we can add those events
       * immediately.
       * For native ShadowDom the select gets render before the listboxNode is available so we
       * will add an event to the slotchange and add the events once available.
       */
      __setupListboxNode() {
        if (this._listboxNode) {
          this.__setupListboxInteractions();
        } else {
          const inputSlot = this.shadowRoot.querySelector('slot[name=input]');
          if (inputSlot) {
            inputSlot.addEventListener('slotchange', () => {
              this.__setupListboxInteractions();
            });
          }
        }

        const slot = this.shadowRoot.getElementById('options-outlet');
        if (slot) {
          slot.addEventListener('slotchange', () => {
            slot.assignedNodes().forEach(node => {
              this._listboxNode.appendChild(node);
            });
          });
        }
      }

      __listboxOnClick() {
        if (!this.multipleChoice) {
          this.opened = false;
        }
      }

      __setupListboxInteractions() {
        this._listboxNode.setAttribute('role', 'listbox');
        this._listboxNode.setAttribute('aria-orientation', this.orientation);
        this._listboxNode.setAttribute('aria-multiselectable', this.multipleChoice);
        this._listboxNode.setAttribute('tabindex', '0');
        this._listboxNode.addEventListener('click', this.__listboxOnClick);
        this._listboxNode.addEventListener('keyup', this.__listboxOnKeyUp);
        this._listboxNode.addEventListener('keydown', this.__listboxOnKeyDown);
      }

      __teardownListboxNode() {
        if (this._listboxNode) {
          this._listboxNode.removeEventListener('click', this.__listboxOnClick);
          this._listboxNode.removeEventListener('keyup', this.__listboxOnKeyUp);
          this._listboxNode.removeEventListener('keydown', this.__listboxOnKeyDown);
        }
      }

      __preventScrollingWithArrowKeys(ev) {
        if (this.disabled) {
          return;
        }
        const { key } = ev;
        switch (key) {
          case 'ArrowUp':
          case 'ArrowDown':
          case 'Home':
          case 'End':
            ev.preventDefault();
          /* no default */
        }
      }
    },
);
