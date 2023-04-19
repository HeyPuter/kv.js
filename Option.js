class OptionTypeInt {
    readOption (options, optionList, i) {
        options[optionList[i]] = Number.parseInt(optionList[i+1], 10);
        return 1;
    }
    isSet (options, key) {
        return options[key] !== undefined;
    }
}

class OptionTypeFlag {
    readOption (options, optionList, i) {
        options[optionList[i]] = true;
        return 0;
    }
    isSet (options, key) {
        return !! options[key];
    }
}

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