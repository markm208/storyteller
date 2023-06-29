/*
 * This class provides a method that will take in two strings and will return a 
 * string that is lexically in between the two.
 *  
 * A base 62 number can have 0-9, A-Z, and a-z (10 + 26 + 26).
 * 
 * Because these are strings and not real numbers, when they are compared 
 * against each other they will be checked character by character until there 
 * is a mismatch. So, the string '123' will come before '124'. '257' will
 * come after '100'. 
 * 
 * Strings of different lengths have different properties than numbers with  
 * different numbers of digits, however. The string '10', for example, lexically 
 * comes before the string '9' because the computer will compare '1' to '9' as 
 * the first thing it does. We must always keep this lexical comparison in 
 * mind. The rules are:
 * - the computer will compare characters from the beginning of the two strings
 *   until the compared characters are different. Once there is a difference
 *   in the characters that pair of characters determines the lexical ordering
 *   of the strings.
 * - The number of characters in a string does not represent the number of 
 *   significant digits in the 'number' like a purely numeric type would. In 
 *   other words, numeric 10 is greater than numeric 9 not because of the value
 *   of the digits but because the number of digits is greater.
 * 
 * If you compare the strings '1230' and '12300' the first will compare as less than
 * the first because it is shorter. Comparing numbers doesn't work the same way, of
 * course. The numbers 123.0 and 123.00 are the same and will compare as equal. The 
 * reason is that trailing zeros have no effect on the value of the number.
 * 
 * We are dealing with strings. The main requirement is that a new string *always* be 
 * constructed that is in between the two passed in strings. However, because of the 
 * same trailing zeros issue there is no string that can be constructed that will be 
 * between '1230' and '12300'. The issue is that a trailing zero cannot be split into
 * a smaller value. So, this must be avoided. No contructed string can end with a 
 * trailing zero. 
 */
class InBetweenHelper {
    constructor() {  
        this.availableCharacters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        this.largestDigit = this.availableCharacters[this.availableCharacters.length - 1];
    }

    inbetween(first, second) {
        let middleValue;

        if(!first && !second) {
            //return the digit in the middle
            middleValue = this.availableCharacters[Math.floor(this.availableCharacters.length / 2)];
        } else if (first && !second) {
            //increase the first by a small amount
            middleValue = this.increaseString(first);
        } else if(!first && second) {
            //find 
            middleValue = this.midway('0', second);
        } else {
            middleValue = this.midway(first, second);
        }
        return middleValue;
    }

    midway(first, second) {
        //find the last index where all of the digits match
        let sameDigitIndex = -1;
        for(let i = 0;i < first.length && i < second.length;i++) {
            if(first[i] === second[i]) {
                sameDigitIndex = i;
            } else {
                break;
            }
        }

        //create two new strings with only the differing digits
        let firstRemaining = first.substring(sameDigitIndex + 1);
        //if there is nothing left in the first then use a single zero
        if(firstRemaining.length === 0) {
            firstRemaining = '0';
        }
        //there will always be some digits in the second string if it is greater than the first
        let secondRemaining = second.substring(sameDigitIndex + 1);

        //increase the first femaining string by the smallest amount possible
        let middleValue = this.increaseString(firstRemaining);

        //if the increased first string is greater than or equal to the second string
        if(middleValue >= secondRemaining) {
            //then extend the first string by adding digits
            middleValue = this.extendStringByAddingDigits(firstRemaining, secondRemaining);
        }

        //return the first part of the string and the increased middle value
        return first.substring(0, sameDigitIndex + 1) + middleValue;
    }

    increaseString(num) {
        let retVal;
        //split all of the digits into an array
        let digits = num.split('');
        for(let i = digits.length - 1;i >= 0;i--) {
            //increase a digit
            const updatedDigit = this.increaseDigit(digits[i]);
            digits[i] = updatedDigit;
            //if the new digit was not a carry over
            if(updatedDigit !== '0') { 
                break;
            }
        }
        let increasedString = digits.join('');

        //check if all of the digits carried over and become smaller than the original
        //this happens when all the digits are the largest digit: 9->0, 99->00, etc.
        if(increasedString < num) {
            //append a non-zero digit to the end of the original string:9->91, 99->991, etc.
            retVal = num + '1';
        } else { //at least one digit was increased without all of them carrying over
            retVal = increasedString;
        }

        return retVal;
    }

    //--
    increaseDigit(digit) {
        let retVal;

        //if we need to wrap around the three groups
        if(digit === '9') {
            retVal = 'A';
        } else if(digit === 'Z') {
            retVal = 'a';
        } else if(digit === 'z') {
            retVal = '0';
        } else { //no wrap
            //get one digit beyond this one
            retVal = String.fromCodePoint(digit.codePointAt(0) + 1);
        }
        return retVal;
    }

    //--
    extendStringByAddingDigits(first, second) {
        let retVal = '' + first;

        //the number of 0 digits that need to be added to push the first string past the second
        let secondsAdditionalDigits = 0;
        if(second.length > first.length) {
            secondsAdditionalDigits = second.length - first.length;
        }
        //add 0's to push the string length past the second string        
        retVal += '0'.repeat(secondsAdditionalDigits);
        
        retVal += '1';
        return retVal;
    }
}

module.exports = InBetweenHelper;
