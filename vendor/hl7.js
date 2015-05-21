'use strict';
//main module that exports all other sub modules

exports.parseString = require('./lib/parser.js').parseString;
exports.serializeJSON = require('./lib/serializer.js').serializeJSON;
exports.translate = require('./lib/translate.js').translate;
'use strict';

//http://python-hl7.readthedocs.org/en/latest/accessors.html

var SEGMENT = '\r';
var FIELD = '|';
var COMPONENT = '^';
var FIELDREPEAT = '~';
var ESCAPE = '\\';
var SUBCOMPONENT = '&';

//Message[segment][field][repetition][component][sub-component]
function parseComponent(data) {
    var result = [];
    var subcomponents = data.split(SUBCOMPONENT);

    var s;
    if (subcomponents.length === 1) {
        s = subcomponents[0];
        result = s;

    } else {

        for (var i = 0; i < subcomponents.length; i++) {
            s = subcomponents[i];
            result.push(s);
        }
    }

    return result;
}

function parseRepeat(data) {
    var result = [];
    var components = data.split(COMPONENT);

    var c;
    if (components.length === 1000) {
        c = parseComponent(components[0]);
        result = c;

    } else {
        for (var i = 0; i < components.length; i++) {
            c = parseComponent(components[i]);
            result.push(c);
        }
    }

    return result;
}

function parseField(data) {
    var result = [];
    var repeats = data.split(FIELDREPEAT);

    for (var i = 0; i < repeats.length; i++) {
        var r = parseRepeat(repeats[i]);
        result.push(r);
    }

    return result;
}

function parseSegment(data) {
    var result = {};
    var fields = data.split(FIELD);

    //var seg_name = fields[0];

    result = [];
    var start = 0;

    //adjusting header segment, inserting | as first field
    if (fields[0] === "MSH") {
        fields[0] = FIELD;
        fields = ["MSH"].concat(fields);

        //ignore MSH1 and MSH2
        start = 3;

        result.push("MSH"); //segment name
        result.push(FIELD); //pipe
        result.push(fields[2]); //separators
    } else {
        result.push(fields[0]); //segment name

        start = 1;
    }

    for (var i = start; i < fields.length; i++) {
        //skip empty fields
        //if (fields[i] === "") continue;

        var f = parseField(fields[i]);
        result.push(f);
    }

    return result;
}

function parse(data) {
    //MSH check
    if (data.substr(0, 3) !== 'MSH') {
        //TODO: throw a proper error here
        return null;
    }

    //define field separator from MSH header
    FIELD = data[3];

    //define all other separators from MSH header
    COMPONENT = data[4];
    FIELDREPEAT = data[5];
    ESCAPE = data[6];
    SUBCOMPONENT = data[7];

    //parse into result object
    var result = [];

    var segments = data.split(SEGMENT);
    for (var i = 0; i < segments.length; i++) {
        if (segments[i] === "") {
            continue;
        }
        var seg = parseSegment(segments[i]);

        result.push(seg);
    }

    return result;

}

function parseString(data, options) {
    //data must be a string
    if (!data || typeof (data) !== "string") {
        //TODO: throw a proper error here
        return null;
    }

    if (arguments.length === 1) {
        options = {};
    }

    data = parse(data);

    return data;
}

module.exports = {
    parseString: parseString,
};
'use strict';

var SEGMENT = '\r';
var FIELD = '|';
var COMPONENT = '^';
var FIELDREPEAT = '~';
var ESCAPE = '\\';
var SUBCOMPONENT = '&';

//Message[segment][field][repetition][component][sub-component]
function serializeComponent(data) {
    if (typeof (data) === "string") {
        return data;
    }
    return data.join(SUBCOMPONENT);
}

function serializeRepeat(data) {
    if (typeof (data) === "string") {
        return data;
    }
    return data.map(serializeComponent).join(COMPONENT);
}

function serializeField(data) {
    if (typeof (data) === "string") {
        return data;
    }
    return data.map(serializeRepeat).join(FIELDREPEAT);
}

function serializeSegment(data) {
    if (typeof (data) === "string") {
        return data;
    }

    //handling header in special way...
    if (data[0] === "MSH") {
        //clone MSH array, since we are modifying it to remove separator elements
        var msh = JSON.parse(JSON.stringify(data));
        msh.shift();
        msh.shift();
        return "MSH" + FIELD + msh.map(serializeField).join(FIELD);
    }

    return data.map(serializeField).join(FIELD);
}

function serialize(data) {
    return data.map(serializeSegment).join(SEGMENT);
}

function serializeJSON(data, options) {
    if (arguments.length === 1) {
        options = {};
    }

    var result = serialize(data);

    return result;
}

module.exports = {
    serializeJSON: serializeJSON,
};
'use strict';
var path = require('path');
var fs = require('fs');

function translateSegment(segment) {

    try {
        var seg_name = segment[0];
        //console.log("translating <" + seg_name + ">");

        var format = fs.readFileSync(path.dirname(fs.realpathSync(__filename)) + "/segments/" + seg_name + ".txt").toString();

        format = format.split("\n");

        var data = {};
        data["Segment"] = segment[0];

        //console.log("segment.lengh", segment.length);
        //console.log("format.lengh", format.length);

        for (var i = 1; i < Math.min(segment.length, format.length - 1); i++) {
            var field_name = format[i + 1].split("\t")[5];
            data[field_name] = segment[i];
        }

        return data;
    } catch (ex) {
        //console.log(ex); //for debug
    }
}

function translate(data) {
    var tr = [];
    for (var seg in data) {
        tr.push(translateSegment(data[seg]));
    }

    return tr;
}

module.exports = {
    translate: translate,
};
