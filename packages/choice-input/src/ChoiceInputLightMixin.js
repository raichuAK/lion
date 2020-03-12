/* eslint-disable class-methods-use-this */

import { html, css, nothing } from '@lion/core';
// import { FormatMixin } from '@lion/field';
// eslint-disable-next-line import/no-extraneous-dependencies
import { SyncUpdatableMixin } from '@lion/validate/src/utils/SyncUpdatableMixin.js';

export const ChoiceInputLightMixin = superclass =>
  // eslint-disable-next-line
  class ChoiceInputLightMixin extends SyncUpdatableMixin(superclass) {
    static get properties() {
      return {
        /**
         * Boolean indicating whether or not this element is checked by the end user.
         */
        checked: {
          type: Boolean,
          reflect: true,
        },
        // /**
        //  * Contributes to the parent (model) value when checked.
        //  */
        // value: String,
        // /**
        //  * Whereas 'normal' `.modelValue`s usually store a complex/typed version
        //  * of a view value, choice inputs have a slightly different approach.
        //  * In order to remain their Single Source of Truth characteristic, choice inputs
        //  * store both the value and 'checkedness', in the format { value: 'x', checked: true }
        //  * Different from the platform, this also allows to serialize the 'non checkedness',
        //  * allowing to restore form state easily and inform the server about unchecked options.
        //  */
        // modelValue: {
        //   type: Object,
        //   hasChanged: (nw, old = {}) => nw.value !== old.value || nw.checked !== old.checked,
        // },
        /**
         * The value property of the modelValue. It provides an easy interface for storing
         * (complex) values in the modelValue.
         * Contributes to the parent (model) value when checked.
         */
        choiceValue: {
          type: Object,
          attribute: 'choice-value',
        },
        value: String,
      };
    }

    /**
     * @deprecated
     */
    get choiceValue() {
      return this.value;
    }

    /**
     * @deprecated
     */
    set choiceValue(v) {
      this.value = v;
    }

    get value() {
      return this.modelValue ? this.modelValue.value : this.__choiceValue;
    }

    set value(v) {
      if (this.modelValue) {
        this.modelValue.value = v;
      }
      this.__choiceValue = v;
    }

    _requestUpdate(name, old) {
      super._requestUpdate(name, old);

      if (name === 'checked') {
        this.__syncCheckedToInputElement();
        // this.dispatchEvent(new Event('checked-changed', { bubbles: true }));
      }
    }

    updated(c) {
      super.updated(c);
      this.dispatchEvent(new Event('checked-changed', { bubbles: true }));
    }

    constructor() {
      super();
      // this.modelValue = { value: '', checked: false };
      this.checked = false;
    }

    /**
     * Styles for [input=radio] and [input=checkbox] wrappers.
     * For [role=option] extensions, please override completely
     */
    static get styles() {
      return [
        css`
          :host {
            display: flex;
          }

          .choice-field__graphic-container {
            display: none;
          }
        `,
      ];
    }

    /**
     * Template for [input=radio] and [input=checkbox] wrappers.
     * For [role=option] extensions, please override completely
     */
    render() {
      return html`
        <slot name="input"></slot>
        <div class="choice-field__graphic-container">
          ${this._choiceGraphicTemplate()}
        </div>
        <div class="choice-field__label">
          <slot name="label"></slot>
        </div>
      `;
    }

    _choiceGraphicTemplate() {
      return nothing;
    }

    connectedCallback() {
      super.connectedCallback();
      this.addEventListener('user-input-changed', this.__toggleChecked);
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this.removeEventListener('user-input-changed', this.__toggleChecked);
    }

    __toggleChecked() {
      this.checked = !this.checked;
    }

    __syncCheckedToInputElement() {
      // ._inputNode might not be available yet(slot content)
      // or at all (no reliance on platform construct, in case of [role=option])
      if (this._inputNode) {
        this._inputNode.checked = this.checked;
      }
    }

    /**
     * @override
     * Override InteractionStateMixin
     * 'prefilled' should be false when modelValue is { checked: false }, which would return
     * true in original method (since non-empty objects are considered prefilled by default).
     */
    static _isPrefilled(modelValue) {
      return modelValue.checked;
    }

    /**
     * @override
     * This method is overridden from FormatMixin. It originally fired the normalizing
     * 'user-input-changed' event after listening to the native 'input' event.
     * However on Chrome on Mac whenever you use the keyboard
     * it fires the input AND change event. Other Browsers only fires the change event.
     * Therefore we disable the input event here.
     */
    _proxyInputEvent() {}

    /**
     * Used for required validator.
     */
    _isEmpty() {
      return !this.checked;
    }

    /**
     * @override
     * Overridden from FormatMixin, since a different modelValue is used for choice inputs.
     * Synchronization from user input is already arranged in this Mixin.
     */
    _syncValueUpwards() {}
  };
