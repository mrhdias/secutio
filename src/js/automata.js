/*
    Automata.js
    Author: Henrique Dias
    Last Modification: 2024-01-15 21:47:20

    Attention: This is work in progress

    References:
    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
    https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
    https://knockoutjs.com/
    https://dev.to/paulgordon/after-using-rawjs-im-never-touching-react-again-or-any-framework-vanilla-javascript-is-the-future-3ac1
    https://github.com/polight/lego
    https://web.dev/articles/custom-elements-v1
 */

'use strict';
export default class Automata {

    constructor(parameters = {
        "attribute": "data-tasks",
        "json_file": "tasks.json",
        "start_element": "body"
    }) {

        // https://developer.mozilla.org/en-US/docs/Web/API/Element#events
        // https://developer.mozilla.org/en-US/docs/Web/API/Window/load_event
        // Some events to test
        this.triggers = new Set([
            'click',
            'init', // custom
            'mouseenter',
            'mouseover',
            'mouseup',
            'mouseleave',
            'scroll',
            'scrollend',
            'submit'
        ]);
        this.methods = new Set([
            'get',
            'post',
            'put',
            'patch',
            'delete',
        ]);
        this.dataAttribute = parameters["attribute"];
        this.jsonFile = parameters["json_file"];
        this.startElement = parameters["start_element"];
        this.tasks = {};
    }

    fetchOptions(properties, data) {
        let options = {
            method: properties.method,
            cache: "no-cache",
            // credentials: 'include',
            // mode: 'cors',
            // origin: 'http://localhost:808'
        };
        if (properties.method === 'put') {
            options['headers'] = {
                "Content-Type": "application/json"
                // "Accept": 'application/json'
                // 'Content-Type': 'application/x-www-form-urlencoded',
            };
            options['body'] = JSON.stringify(data);
            return options;
        };

        // get default method
        return options;
    }

    async makeRequest(properties, data = {}) {
        // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch

        console.log('Body Data:', data, properties.action);

        try {
            const response = await fetch(properties.action, this.fetchOptions(properties, data));
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }

            let result = { transformation: {}, data: undefined };
            if (response.headers.has("Automata-Transformation")) { // is optional and if not exits use from tasks file
                console.log("Automata-Transformation:", response.headers.get("Automata-Transformation"));
                const headerValue = response.headers.get("Automata-Transformation");
                if (headerValue !== "") {
                    result.transformation = this.attrsStr2Obj(headerValue);
                }
            }
            // else {
            //    throw new Error('The "Automata-Transformation" header does not exist');
            // }

            if (response.headers.has("Content-Type")) {
                // console.log("Content-Type:", response.headers.get("Content-Type"));
                if (response.headers.get("Content-Type").includes("application/json")) {
                    const json = await response.json();
                    // console.log('Response: ', json);

                    result.data = json;
                    return result;
                }
            }

            const fragment = await response.text();
            result.data = fragment;
            return result;

        } catch (error) {
            console.error(error);
        }

    }

    attrsStr2Obj(data) {
        if (data === '') {
            return {};
        }

        const properties = data.replace(/[\r\n] */gm, '').replace(/\;$/, '').split(/\; */);

        let obj = {};
        for (const keyValuePair of properties) {
            const tup = keyValuePair.split(/\: */);
            if (tup.length != 2) {
                throw new Error(`Wrong data atribute: ${keyValuePair}`);
            }
            obj[tup[0]] = tup[1];
        }

        return obj;
    }

    async getResource(filepath) {
        // test if the extension is json
        if (filepath.length <= '.json'.length || !filepath.endsWith('.json')) {
            throw new Error(`The ${filepath} file is not valid for this operation!`);
        }

        const response = await fetch(filepath, {
            cache: "no-cache"
        });
        if (!response.ok) {
            throw new Error(`When fetching the file ${filepath} happen an HTTP error! status: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    // removeAllChildNodes(parent) {
    //    while (parent.firstChild) {
    //        parent.removeChild(parent.firstChild);
    //    }
    // }

    swapContent(clone, target, swap = 'inner') {

        // ...clone.childNodes to remove helper div element

        // Replaces the existing children of a Node
        // with a specified new set of children.
        if (swap === 'inner') { // default swap option
            target.replaceChildren(...clone.childNodes);
            return;
        }

        // Replaces this Element in the children list of
        // its parent with a set of Node or string objects
        if (swap === 'outer') {
            target.replaceWith(...clone.childNodes);
            return;
        }

        // Inserts a set of Node or string objects in the children
        // list of this Element's parent, just before this Element.
        if (swap === 'before') {
            target.before(...clone.childNodes);
        }

        // Inserts a set of Node or string objects in the children
        // list of the Element's parent, just after the Element.
        if (swap === 'after') {
            target.after(...clone.childNodes);
            return;
        }

        // Inserts a set of Node objects or string
        // objects before the first child of the Element.
        if (swap === 'prepend') {
            target.prepend(...clone.childNodes);
            return;
        }

        // Inserts a set of Node objects or string
        // objects after the last child of the Element.
        if (swap === 'append') {
            target.append(...clone.childNodes);
            return;
        }

        // Removes the target element from the DOM.
        if (swap === 'delete') {
            target.remove();
            return;
        }

        // It exists only for convenience, but does
        // not make any transformations.
        if (swap === 'none') {
            return;
        }

        throw new Error(`swap "${swap}" attribute not supported`);
    }

    addKeyValue(data, name, value, makeArray = false) {
        if (data.hasOwnProperty(name)) {
            if (Array.isArray(data[name])) {
                data[name].push(value);
            } else {
                const tmp = data[name];
                data[name] = [];
                data[name].push(tmp, value);
            }
        } else {
            if (makeArray) {
                data[name] = [];
                data[name].push(value);
            } else {
                data[name] = value;
            }
        }
    }

    collectBodyData(element, data, key = '') {

        if (element.hasChildNodes()) {
            if (element.hasAttribute('name')) {
                if (element.hasAttribute('name') && !element.hasAttribute('value')) {
                    data[element.name] = [];
                    key = element.name;
                }
            }
            for (const node of element.childNodes) {
                if (node.nodeType !== Node.TEXT_NODE) {
                    this.collectBodyData(node, data, key);
                }
            }
        }

        if (element.nodeType !== Node.TEXT_NODE) {
            if (element.hasAttribute('value')) {

                if (element.hasAttribute('name')) {
                    if (element.hasAttribute('type') &&
                        element.type.toLowerCase() === 'radio') {
                        if (element.checked) {
                            this.addKeyValue(data, element.name, element.value);
                        }
                    } else if (element.type.toLowerCase() === 'checkbox') {
                        if (element.checked) {
                            this.addKeyValue(data, element.name, element.value, true);
                        }
                    } else {
                        this.addKeyValue(data, element.name, element.value);
                    }
                } else {

                    if (element.nodeName === 'OPTION' &&
                        element.selected) {
                        const selectElem = element.closest('select');
                        if (selectElem.hasChildNodes()) {
                            this.addKeyValue(data, selectElem.name, element.value, true);
                        }
                    }

                }
            }
        }
    }

    findTasksRecursively(targetNode) {

        for (const node of targetNode.childNodes) {
            if (node.nodeType === Node.TEXT_NODE ||
                node.nodeType === Node.COMMENT_NODE) {
                continue;
            }

            if (node.hasChildNodes()) {
                this.findTasksRecursively(node);
            }

            if (node.hasAttribute(this.dataAttribute) &&
                node.getAttribute(this.dataAttribute) !== "") {
                this.setTask(node);
            }
        }
    }

    minifyJavaScript(input) {
        // Minimizes any JavaScript code that
        // is included in the templates.

        /*
        // Remove comments (single-line and multi-line)
        let minifiedCode = input.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');

        // Remove whitespace (including newlines and tabs)
        minifiedCode = minifiedCode.replace(/\s+/g, ' ');

        // Trim leading and trailing whitespace
        minifiedCode = minifiedCode.trim();

        return minifiedCode;
        */
        return input.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
    }

    reScript(helper) {
        // Trick to make the Javascript code work when inserted from a template.
        // Replace it with another clone element script.

        for (const node of helper.childNodes) {
            if (node.hasChildNodes()) {
                this.reScript(node);
            }
            if (node.nodeName === 'SCRIPT') {
                const script = document.createElement('script');
                script.type = "text/javascript";
                script.textContent = this.minifyJavaScript(node.textContent);
                node.replaceWith(script);
            }
        }
    }


    buildFragment(data, source) {
        // const fragment = document.createDocumentFragment();
        // create helper div element
        const helper = document.createElement('div');
        helper.innerHTML = eval('`' + source + '`');

        this.reScript(helper);

        // remove the element helper div element
        return helper;
    }

    async fetchTemplate(templateName) {
        try {
            const response = await fetch('./templates/'.concat(templateName, '.html'));
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }
            return response.text();

        } catch (error) {
            console.error(error);
        }

        return undefined;
    }

    setTransformation(properties, transformation) {
        // Check if server send the transformation and
        // if not replace by the transformation from tasks file.

        if (transformation.hasOwnProperty('target')) {
            properties['target'] = transformation['target'];
        } else if (!properties.hasOwnProperty('target')) {
            properties['target'] = 'this'; // default target
        }

        if (transformation.hasOwnProperty('template')) {
            properties['template'] = transformation['template'];
        }

        if (transformation.hasOwnProperty('swap')) {
            properties['swap'] = transformation['swap'];
        } else if (!properties.hasOwnProperty('swap')) {
            properties['swap'] = 'inner'; // default swap
        }

        if (transformation.hasOwnProperty('remove')) {
            properties['remove'] = transformation['remove'];
        }
    }

    async templateManager(finalTarget, properties, data) {
        // console.log('Template Manager...');

        if (properties.template.length < 3) {
            throw new Error(`Short template name "${properties.template}"`);
        }

        const innerTemplate = await (async function (_this) {

            switch (Array.from(properties.template)[0]) {
                case '@':
                    return await _this.fetchTemplate(properties.template.substring(1));
                case '#':
                    const template = document.getElementById(properties.template.substring(1));
                    if (template === null) {
                        throw new Error(`Template "${properties.template}" not exist!`);
                    }
                    // console.log('Template Node Name:', template.content.children[0].nodeName);
                    if (template.content.hasChildNodes() &&
                        template.content.nodeType === Node.DOCUMENT_FRAGMENT_NODE &&
                        template.content.children[0].nodeName === 'TEXTAREA' &&
                        template.content.children[0].hasAttribute('data-codeblock')) {
                        // console.log('Template content:', template.content.children[0].value);
                        return template.content.children[0].value;
                    }
                    throw new Error(`Invalid "${properties.template}" embedded template`);
                default:
                    throw new Error(`Invalid "${properties.template}" fetched template`);
            }

        }(this));

        const helperFragment = this.buildFragment(data, innerTemplate);
        if (helperFragment === null) {
            throw new Error(`An error happened while processing the "${properties.template}" template`);
        }

        // remove specifed elements before swap content
        if (properties.hasOwnProperty('remove') &&
            properties.remove !== "") {
            const elements = finalTarget.querySelectorAll(properties.remove);
            for (const element of elements) {
                element.remove();
            }
        }

        this.findTasksRecursively(helperFragment);
        this.swapContent(helperFragment, finalTarget, properties.swap);
    }

    async processEvent(eventTarget, properties) {

        // In events without action and method,
        // the target can be replaced with templates.
        if (!(properties.hasOwnProperty('action') &&
            properties.hasOwnProperty('method'))) {

            const finalTarget = (properties.target === 'this') ?
                eventTarget : document.querySelector(properties.target);

            if (finalTarget === null) {
                throw new Error(`Template "${properties.target}" not exist!`);
            }

            if (properties.hasOwnProperty('template')) {
                // If the "local-data" property is defined, fetch the data.
                const jsonData = await (async function (_this) {
                    if (properties.hasOwnProperty('file-path')) {
                        return await _this.getResource(properties['file-path']);
                    }
                    return {};
                }(this));
                this.templateManager(finalTarget, properties, jsonData);
            }

            return;
        }


        // event.preventDefault();

        let bodyData = {};
        if (properties.trigger === 'submit') {
            const formElem = eventTarget.closest('form');
            if (formElem !== null &&
                formElem.hasChildNodes()) {
                const namedElements = formElem.querySelectorAll("input[name],select[name]");
                for (const namedElement of namedElements) {
                    this.collectBodyData(namedElement, bodyData);
                }
            }
        } else if (properties.hasOwnProperty('collect-data')) {
            const collectFromElems = document.querySelectorAll(properties['collect-data']);
            for (const collectFromElem of collectFromElems) {
                this.collectBodyData(collectFromElem, bodyData);
            }

            // Check if body data is empty
            if (["post", "put"].includes(properties['method']) &&
                Object.keys(bodyData).length === 0) {
                return;
            }

            if (eventTarget.name !== '') {
                bodyData[eventTarget.name] = eventTarget.value;
            }
        }

        // default method
        if (properties.hasOwnProperty('method')) {
            properties.method = properties.method.toLowerCase();
            if (!this.methods.has(properties.method)) {
                throw new Error(`Unknown HTTP method: ${properties.method}`);
            }
        } else {
            properties['method'] = 'get';
        }

        const block = await this.makeRequest(properties, bodyData);
        if (block === undefined) {
            return;
        }

        this.setTransformation(properties, block.transformation);

        const finalTarget = (properties.target === 'this') ?
            eventTarget : document.querySelector(properties.target);

        if (finalTarget === null) {
            throw new Error(`Template "${properties.target}" not exist!`);
        }

        // if data is json
        if (typeof block.data === 'object') {

            // with templates
            if (properties.hasOwnProperty('template')) {
                this.templateManager(finalTarget, properties, block.data);
            }

        } else if (typeof block.data === 'string' && block.data !== "") {

            const helperFragment = function (_this) {
                const helperElem = document.createElement('div');
                helperElem.innerHTML = block.data;

                _this.reScript(helperElem);

                return helperElem;
            }(this);

            // remove specifed elements before swap content
            if (properties.hasOwnProperty('remove') &&
                properties.remove !== "") {
                const elements = finalTarget.querySelectorAll(properties.remove);
                for (const element of elements) {
                    element.remove();
                }
            }

            this.findTasksRecursively(helperFragment);
            this.swapContent(helperFragment, finalTarget, properties.swap);

        } else {
            throw new Error("There is no data or text for the transformation");
        }

    }

    async setTask(element) {

        const elementTasks = element.dataset.tasks.split(/ +/);

        for (const task of elementTasks) {
            if (!this.tasks.hasOwnProperty(task)) {
                throw new Error(`The task "${task}" not exist in tasks file!`);
                // continue;
            }

            console.log("Task:", task);

            const properties = this.tasks[task];

            // replace with custom attributes
            // the action can exist together with the attribute and
            // is used by default when the attribute is not defined.
            for (const key of ['action', 'method', 'trigger']) {
                const property = 'attribute-'.concat(key);
                if (properties.hasOwnProperty(property) &&
                    element.hasAttribute(properties[property]) &&
                    element.getAttribute(properties[property]) !== "") {
                    properties[key] = element.getAttribute(properties[property]);
                }
            }

            // the default trigger for Button is "click"
            if (!(properties.hasOwnProperty('trigger') &&
                this.triggers.has(properties.trigger)) &&
                (element.nodeName === 'BUTTON' ||
                    (element.nodeName === 'INPUT' && element.type === 'button'))) {
                properties.trigger = 'click';
            }

            // custom event
            if (properties.trigger === 'init') { // fired after page loaded
                this.processEvent(element, properties);
                continue;
            }

            // https://developer.mozilla.org/en-US/docs/Web/API/Document/scroll_event

            const targetElem = function () {
                if (properties.trigger === 'scroll' || properties.trigger === 'scrollend') {
                    return document;
                }
                return element;
            }();

            targetElem.addEventListener(properties.trigger, (event) => {
                event.preventDefault();
                this.processEvent(event.target, properties);
            });
        }
    }

    search4Tasks(parentNode) {
        const elemWithTasks = parentNode.querySelectorAll("[" + this.dataAttribute + "]");
        if (elemWithTasks.length > 0) {
            for (const element of elemWithTasks) {
                if (element.dataset.tasks !== "") {
                    // console.log(element.dataset.tasks);
                    this.setTask(element);
                }
            }
        }
    }

    init() {

        const targetNode = document.getElementsByTagName(this.startElement);

        // https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
        // begin mutation observer

        const config = {
            childList: true,
            subtree: true
        };

        const callback = (mutations, observer) => {
            mutations.forEach(mutation => {
                if (mutation.type === "childList") {

                    for (const addedNode of mutation.addedNodes) {
                        // on added
                        console.log("Added Nodes...");
                    }

                    for (const removedNode of mutation.removedNodes) {
                        // on removed
                        console.log("Removed Nodes...");
                    }

                    if (mutation.target.childNodes.length === 0) {
                        observer.disconnect();
                    }
                }
            });
        }

        const observer = new MutationObserver(callback);
        observer.observe(targetNode[0], config);
        // end mutation observer

        this.getResource(this.jsonFile).then((data) => {
            this.tasks = data;
            this.search4Tasks(targetNode[0]);
        });
    }

}

export { Automata };

// const automata = new Automata();
// automata.init();
