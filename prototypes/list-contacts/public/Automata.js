/* <![CDATA[ */
/*
    Automata.js
    Author: Henrique Dias
    Last Modification: 2024-01-12 18:43:56

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
        "json_file": "tasks.json"
    }) {

        // https://developer.mozilla.org/en-US/docs/Web/API/Element#events
        // https://developer.mozilla.org/en-US/docs/Web/API/Window/load_event
        // Some events to test
        this.triggers = new Set([
            'click',
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
        this.tasks = {};
    }

    fetchOptions(parameters, data) {
        let options = {
            method: parameters.method,
            cache: "no-cache",
            // credentials: 'include',
            // mode: 'cors',
            // origin: 'http://localhost:808'
        };
        if (parameters.method === 'put') {
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

    async makeRequest(parameters, data = {}) {
        // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch

        console.log('Body Data:', data, parameters.action);

        try {
            const response = await fetch(parameters.action, this.fetchOptions(parameters, data));
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }

            let result = { transformation: {}, data: undefined };
            if (response.headers.has("Automata-Transformation")) {
                console.log("Automata-Transformation:", response.headers.get("Automata-Transformation"));
                const headerValue = response.headers.get("Automata-Transformation");
                if (headerValue !== "") {
                    result.transformation = this.attrsStr2Obj(headerValue);
                }
            } else {
                throw new Error('The "Automata-Transformation" header does not exist');
            }

            if (response.headers.has("Content-Type")) {
                // console.log("Content-Type:", response.headers.get("Content-Type"));

                if (response.headers.get("Content-Type") === "application/json") {
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

        const parameters = data.replace(/[\r\n] */gm, '').replace(/\;$/, '').split(/\; */);

        let obj = {};
        for (const keyValuePair of parameters) {
            const tup = keyValuePair.split(/\: */);
            if (tup.length != 2) {
                throw new Error(`Wrong data atribute: ${keyValuePair}`);
            }
            obj[tup[0]] = tup[1];
        }

        return obj;
    }

    async getDefinedTasks() {
        // add code to get remote tasks
        const response = await fetch(this.jsonFile, {
            cache: "no-cache"
        });

        this.tasks = await response.json();
    }

    // removeAllChildNodes(parent) {
    //    while (parent.firstChild) {
    //        parent.removeChild(parent.firstChild);
    //    }
    // }

    swapContent(clone, target, swap = 'innerHTML') {

        // https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML
        // innerHTMl is the default swap
        if (swap === 'innerHTML') {
            // target.innerHTML = '';
            target.replaceChildren(clone);
            // target.appendChild(clone);
            return;
        }
        if (swap === 'outerHTML') {
            target.replaceWith(clone);
            return;
        }
        if (swap === 'beforebegin') {
            target.parentNode.insertBefore(clone, target);
            return;
        }
        if (swap === 'afterbegin') {
            target.insertBefore(clone, target.firstChild);
            return;
        }
        if (swap === 'beforeend') {
            target.appendChild(clone);
            // target.insertAdjacentHTML(
            //    'beforeend',
            //    clone.firstElementChild.outerHTML
            // );
            return;
        }
        if (swap === 'afterend') {
            target.parentNode.insertBefore(clone, target.nextSibling);
            return;
        }
        if (swap === 'delete') {
            console.log('unimplemented');
            return;
        }
        if (swap === 'none') {
            console.log('unimplemented');
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

    buildFragment(data, source) {
        const fragment = document.createDocumentFragment();
        const clone = document.createElement('div');
        clone.innerHTML = eval('`' + source + '`');

        // Trick to make Javascript work. Remove it and add again.
        let txtScripts = [];
        while (clone.firstChild) {
            if (clone.hasChildNodes()) {
                for (const node of clone.childNodes) {
                    if (node.nodeName === 'SCRIPT') {
                        txtScripts.push(node.textContent);
                        node.remove();
                    }
                }
            }
            fragment.appendChild(clone.firstChild);
        }

        for (const txtScript of txtScripts) {
            const script = document.createElement('script');
            script.type = "text/javascript";
            script.textContent = this.minifyJavaScript(txtScript);
            fragment.appendChild(script);
        }

        return fragment;
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

    async processEvent(event, parameters) {

        event.preventDefault();

        let bodyData = {};
        if (parameters.trigger === 'submit') {
            const formElem = event.target.closest('form');
            if (formElem !== null &&
                formElem.hasChildNodes()) {
                const namedElements = formElem.querySelectorAll("input[name],select[name]");
                for (const namedElement of namedElements) {
                    this.collectBodyData(namedElement, bodyData);
                }
            }
        } else if (parameters.hasOwnProperty('collect-data')) {
            const collectFromElems = document.querySelectorAll(parameters['collect-data']);
            for (const collectFromElem of collectFromElems) {
                this.collectBodyData(collectFromElem, bodyData);
            }

            // Check if body data is empty
            if (["post", "put"].includes(parameters['method']) &&
                Object.keys(bodyData).length === 0) {
                return;
            }

            if (event.target.name !== '') {
                bodyData[event.target.name] = event.target.value;
            }
        }
        // event.preventDefault();

        // default method
        if (parameters.hasOwnProperty('method')) {
            parameters.method = parameters.method.toLowerCase();
            if (!this.methods.has(parameters.method)) {
                throw new Error(`Unknown HTTP method: ${parameters.method}`);
            }
        } else {
            parameters['method'] = 'get';
        }

        const block = await this.makeRequest(parameters, bodyData);
        if (block === undefined) {
            return;
        }

        // console.log(event.target);

        const target = function () {
            // first priority
            if (block.transformation.hasOwnProperty('target')) {
                return document.querySelector(block.transformation.target);
            }
            if (parameters.hasOwnProperty('target')) {
                return document.querySelector(parameters.target);
            }
            // if the target is not defined, use the element that triggered the event.
            return event.target;
        }()

        if (target === null) {
            throw new Error("Null target");
        }

        // if data is json
        if (typeof block.data === 'object') {

            block.transformation['remove-attributes'] = function () {
                if (block.transformation.hasOwnProperty('remove-attributes')) {
                    return block.transformation['remove-attributes'] === "true";
                }
                return true; // default value
            }();

            // with templates
            if (block.transformation.hasOwnProperty('template')) {

                if (block.transformation.template.length < 3) {
                    throw new Error(`Short template name "${block.transformation.template}"`);
                }

                const innerTemplate = await (async function (_this) {

                    switch (Array.from(block.transformation.template)[0]) {
                        case '@':
                            return await _this.fetchTemplate(block.transformation.template.substring(1));
                        case '#':
                            const template = document.getElementById(block.transformation.template.substring(1));
                            // console.log('Template Node Name:', template.content.children[0].nodeName);
                            if (template.content.hasChildNodes() &&
                                template.content.nodeType === Node.DOCUMENT_FRAGMENT_NODE &&
                                template.content.children[0].nodeName === 'TEXTAREA' &&
                                template.content.children[0].hasAttribute('data-codeblock')) {
                                // console.log('Template content:', template.content.children[0].value);
                                return template.content.children[0].value;
                            }
                            throw new Error(`Invalid "${block.transformation.template}" embedded template`);
                        default:
                            throw new Error(`Invalid "${block.transformation.template}" fetched template`);
                    }

                }(this));

                const fragment = this.buildFragment(block.data, innerTemplate);
                if (fragment !== null) {

                    // remove specied elements before swap content
                    if (block.transformation.hasOwnProperty('remove') &&
                        block.transformation.remove !== "") {
                        const elements = target.querySelectorAll(block.transformation.remove);
                        for (const element of elements) {
                            element.remove();
                        }
                    }

                    this.swapContent(fragment, target, function () {
                        // first priority
                        if (block.transformation.hasOwnProperty('swap')) {
                            return block.transformation['swap'];
                        }
                        if (parameters.hasOwnProperty('swap')) {
                            return block.transformation['swap'];
                        }
                        return 'innerHTML';
                    }());
                    this.findTasksRecursively(target);
                }
            }

        } else if (typeof block.data === 'string' && block.data !== "") {

            const fragment = document.createDocumentFragment();
            const blockData = document.createElement('div');
            blockData.innerHTML = block.data;
            while (blockData.firstChild) {
                fragment.appendChild(blockData.firstChild);
            }
            this.swapContent(fragment, target, block.transformation.swap);
            this.findTasksRecursively(target);

        } else {
            throw new Error("There is no data or text for the transformation");
        }

    }

    async setTask(element) {

        const elementTasks = element.dataset.tasks.split(/ +/);

        for (const task of elementTasks) {
            if (!this.tasks.hasOwnProperty(task)) {
                continue;
            }

            // console.log("Task:", task);

            const parameters = this.tasks[task];
            // the default trigger for Button is "click"
            if (!(parameters.hasOwnProperty('trigger') &&
                this.triggers.has(parameters.trigger)) &&
                (element.nodeName === 'BUTTON' ||
                    (element.nodeName === 'INPUT' && element.type === 'button'))) {
                parameters.trigger = 'click';
            }

            // add custom action attribute
            if (parameters.hasOwnProperty('attribute-action') &&
                element.hasAttribute(parameters['attribute-action']) &&
                element.getAttribute(parameters['attribute-action']) !== "") {
                parameters["action"] = element.getAttribute(parameters['attribute-action']);
            }

            // https://developer.mozilla.org/en-US/docs/Web/API/Document/scroll_event

            const targetElem = function () {
                if (parameters.trigger === 'scroll' || parameters.trigger === 'scrollend') {
                    return document;
                }
                return element;
            }();

            targetElem.addEventListener(parameters.trigger, (event) => {
                this.processEvent(event, parameters);
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

        const targetNode = document.getElementsByTagName('body');

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

        this.getDefinedTasks().then(() => {
            this.search4Tasks(targetNode[0]);
        });
    }

}

export { Automata };

// const automata = new Automata();
// automata.init();

/* ]]> */