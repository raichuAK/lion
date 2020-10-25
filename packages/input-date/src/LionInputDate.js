import { IsDate } from '@lion/form-core';
import { LionInput } from '@lion/input';
import { formatDate, LocalizeMixin, parseDate, localize, getDateMask } from '@lion/localize';

/**
 * @param {Date|number} date
 */
function isValidDate(date) {
  // to make sure it is a valid date we use isNaN and not Number.isNaN
  // @ts-ignore dirty hack, you're not supposed to pass Date instances to isNaN
  // eslint-disable-next-line no-restricted-globals
  return date instanceof Date && !isNaN(date);
}

/**
 * `LionInputDate` has a .modelValue of type Date. It parses, formats and validates based
 * on locale.
 *
 * @customElement lion-input-date
 */
// @ts-expect-error https://github.com/microsoft/TypeScript/issues/40110
export class LionInputDate extends LocalizeMixin(LionInput) {
  static get properties() {
    return {
      modelValue: Date,
    };
  }

  constructor() {
    super();
    /**
     * @param {string} value
     */
    this.parser = value => (value === '' ? undefined : parseDate(value));
    this.formatter = formatDate;
    this.defaultValidators.push(new IsDate());
  }

  /** @param {import('lit-element').PropertyValues } changedProperties */
  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has('locale')) {
      this._calculateValues({ source: null });
    }
  }

  connectedCallback() {
    // eslint-disable-next-line wc/guard-super-call
    super.connectedCallback();
    this.type = 'text';
  }

  /**
   * @param {Date} modelValue
   */
  // eslint-disable-next-line class-methods-use-this
  serializer(modelValue) {
    if (!isValidDate(modelValue)) {
      return '';
    }
    // modelValue is localized, so we take the timezone offset in milliseconds and subtract it
    // before converting it to ISO string.
    const offset = modelValue.getTimezoneOffset() * 60000;
    return new Date(modelValue.getTime() - offset).toISOString().slice(0, 10);
  }

  /**
   * @param {string} serializedValue
   */
  // eslint-disable-next-line class-methods-use-this
  deserializer(serializedValue) {
    return new Date(serializedValue);
  }

  async _getMessageMeta(){
    return { datemask: getDateMask(localize.locale)};
  }
}
