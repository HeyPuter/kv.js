/**
 * OptionTypeInt describes options of integer type.
 * 
 * Integer type options such as 'EXAT' consume two items
 * from the options array. For example in this call:
 *      set('k', 'v', ['EXAT', 12345]))
 * OptionTypeInt consumes the string 'EXAT' and the
 * number 12345.
 * 
 * Integer options are considered to be "set" when they
 * have any value, including 0.
 */
class OptionTypeInt {
    readOption (options, optionList, i) {
        options[optionList[i]] = Number.parseInt(optionList[i+1], 10);
        return 1;
    }
    isSet (options, key) {
        return options[key] !== undefined;
    }
}

/**
 * OptionTypeFlag describes options of flag type.
 * 
 * Flag type options such as 'NX' consume one item
 * from the options array (just the option name).
 * 
 * Flag options are considered set if their value
 * is true, and considered unset if their value is false.
 */
class OptionTypeFlag {
    readOption (options, optionList, i) {
        options[optionList[i]] = true;
        return 0;
    }
    isSet (options, key) {
        return !! options[key];
    }
}

/**
 * An instance of Option represents a recognized option.
 * Option has an OptionType by composition, which controls
 * how the option is interpreted from the options array and
 * when it is considered to be set.
 */
class Option {
    constructor (optionKey, optionType) {
        this.optionKey = optionKey;
        this.optionType = optionType;
    }

    // proxy methods
    readOption (...a) { return this.optionType.readOption(...a); }
    isSet (...a) { return this.optionType.isSet(...a); }

    static normalizeKey (key) {
        return key?.toUpperCase?.();
    }
}

module.exports = { Option, OptionTypeFlag, OptionTypeInt };
