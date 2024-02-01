/*
    Secutio.js
    Author: Henrique Dias
    Last Modification: 2024-02-01 18:07:32

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
export default class Secutio {

    constructor(parameters = {
        "tasks_attribute": "data-tasks",
        "start_element": "body"
    }) {

        // https://developer.mozilla.org/en-US/docs/Web/API/Element#events
        // https://developer.mozilla.org/en-US/docs/Web/API/Window/load_event
        // Some events to test
        this.triggers = new Set([
            'click',
            'init', // custom
            'keydown',
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
        this.tasksAttribute = parameters["tasks_attribute"];
        this.startElement = parameters["start_element"];
        this.tasks = {};
        this.custom_functions = {};
    }

    fetchOptions(properties, data) {
        // https://developer.mozilla.org/en-US/docs/Web/API/fetch
        let options = {
            method: properties.method,
            cache: "no-cache",
            signal: AbortSignal.timeout(1000 *
                (properties.hasOwnProperty('timeout') ? parseInt(properties.timeout, 10) : 300))
            // credentials: 'include',
            // mode: 'cors',
            // origin: 'http://localhost:808'
        };
        if (['post', 'put', 'patch'].includes(properties.method)) {
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
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch

        console.log('Body Data:', data, properties.action);

        try {
            const response = await fetch(properties.action, this.fetchOptions(properties, data));
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }

            let result = { transformation: {}, data: undefined, error: false };
            if (response.headers.has("Secutio-Transformation")) { // is optional and if not exits use from tasks file
                console.log("Secutio-Transformation:", response.headers.get("Secutio-Transformation"));
                const headerValue = response.headers.get("Secutio-Transformation");
                if (headerValue !== "") {
                    result.transformation = this.attrsStr2Obj(headerValue);
                }
            }
            // else {
            //    throw new Error('The "Secutio-Transformation" header does not exist');
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
            // console.error(error);
            if (properties.hasOwnProperty('error')) {
                return {
                    transformation: {},
                    data: `${error.name}: ${error.message}`,
                    error: true
                };
            }
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

    async getResource(filepath, skip404 = false) {
        // test if the extension is json
        if (filepath.length <= '.json'.length || !filepath.endsWith('.json')) {
            throw new Error(`The ${filepath} file is not a valid JSON file!`);
        }

        const response = await fetch(filepath, {
            cache: "no-cache"
        });
        if (!response.ok) {
            if (response.status === 404 && skip404) {
                return {};
            }
            throw new Error(`When fetching the file ${filepath} \
                happen an HTTP error! status: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    runNextTask(target, task) {

        if (!this.tasks.hasOwnProperty(task)) {
            throw new Error(`The next task "${task}" not exist in tasks file!`);
        }

        const properties = this.tasks[task];

        if (!properties.hasOwnProperty('disabled')) {
            properties['disabled'] = false;
        }

        if (properties.hasOwnProperty('trigger')) {
            throw new Error(`The trigger property from "${task}" is not allowed in next task!`);
        }

        if (properties.disabled === false) {
            this.setTemplateData(target, properties, undefined);
        }
    }

    runSubtasks(tasksListStr) {

        const subtasks = tasksListStr.split(/ +/);

        for (const subtask of subtasks) {

            if (!this.tasks.hasOwnProperty(subtask)) {
                throw new Error(`The subtask "${subtask}" not exist in tasks file!`);
            }
            if (!this.tasks[subtask].hasOwnProperty('selector')) {
                continue;
            }

            const properties = this.tasks[subtask];

            for (const property in properties) {
                if (!['selector', 'remove', 'add'].includes(property)) {
                    throw new Error(`The property "${property}" in subtask "${subtask}" is not allowed with property "selector"!`);
                }
            }

            if (Object.prototype.toString.call(properties) !== '[object Object]') {
                throw new Error(`The properties of subtask "${subtask}" is not a object!`);
            }
            if (!properties.hasOwnProperty('selector')) {
                throw new Error(`The properties of subtask "${subtask}" not have a selector!`);
            }

            const elements = document.querySelectorAll(properties['selector']);
            // if empty removes all selected elements
            if (properties.hasOwnProperty('remove') &&
                Object.keys(properties['remove']).length === 0) {
                for (const element of elements) {
                    element.remove();
                }
                continue
            }

            for (const element of elements) {
                // first remove anything from element
                if (properties.hasOwnProperty('remove')) {
                    // remove attributes from a list
                    if (properties['remove'].hasOwnProperty('attributes')) {
                        if (!Array.isArray(properties['remove']['attributes'])) {
                            throw new Error(`The property "remove/attributes" of subtask "${subtask}" is not an array!`);
                        }

                        for (const attribute of properties['remove']['attributes']) {
                            if (element.hasAttribute(attribute)) {
                                element.removeAttribute(attribute);
                                if (attribute === 'class' || attribute === 'style') {
                                    return true;
                                }
                            }
                        }
                    }

                    if (element.hasAttribute('class') && properties['remove'].hasOwnProperty('class')) {
                        if (element.classList.contains(properties['remove']['class'])) {
                            element.classList.remove(properties['remove']['class']);
                        }
                        if (element.getAttribute('class') === '') {
                            element.removeAttribute('class');
                        }
                    }

                    if (element.hasAttribute('style') && properties['remove'].hasOwnProperty('style')) {
                        // check if the style exist remove with regex
                        // properties['remove']['style']
                        let style = element.style;
                        const styleProperties = properties['remove']['style'].split(/ +/);
                        for (const p of styleProperties) {
                            if (element.style.hasOwnProperty(p)) {
                                delete style[p];
                            }
                        }
                        element.style = style;
                        // console.log('Element Styles:', element.style.hasOwnProperty('color'));
                        // element.removeAttribute('style');
                        if (element.getAttribute('style') === '') {
                            element.removeAttribute('style');
                        }
                    }
                }

                // and then add anything
                // I have to think about whether a replacement is needed
                if (properties.hasOwnProperty('add')) {
                    if (properties['add'].hasOwnProperty('attributes')) {
                        if (Object.prototype.toString.call(properties['add']['attributes']) !== '[object Object]') {
                            throw new Error(`The properties "add/attributes" of subtask "${subtask}" is not a object!`);
                        }
                        for (const [attribute, value] of Object.entries(properties['add']['attributes'])) {
                            if (!element.hasAttribute(attribute)) {
                                element.setAttribute(attribute, value);
                            }
                        }
                    }

                    if (properties['add'].hasOwnProperty('class')) {
                        element.classList.add(properties['add']['class']);
                    }

                    if (properties['add'].hasOwnProperty('style')) {
                        if (element.hasAttribute('style')) {
                            const styleProperties = this.attrsStr2Obj(properties['add']['style']);
                            for (const [key, value] of Object.entries(styleProperties)) {
                                element.style[key] = value;
                            }
                        } else {
                            element.setAttribute('style', properties['add']['style']);
                        }
                    }
                }
            }
        }
    }

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
                if (!element.hasAttribute('value')) {
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

    search4ElemTasks(parentNode) {
        if (parentNode.hasChildNodes()) {
            for (const node of parentNode.childNodes) {
                // console.log('Search for tasks:', node.nodeType, node.nodeName);
                if (node.nodeName !== 'TEMPLATE' &&
                    node.nodeName !== 'SCRIPT' &&
                    node.nodeType !== node.TEXT_NODE &&
                    node.nodeType !== node.COMMENT_NODE &&
                    node.nodeType !== node.DOCUMENT_FRAGMENT_NODE) {
                    if (node.hasAttribute(this.tasksAttribute)) {
                        this.setTask(node);
                    }
                    if (node.hasChildNodes()) {
                        this.search4ElemTasks(node);
                    }
                }
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


    buildFragment(input, data, source) {

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

        for (const [property, defaultValue] of Object.entries({
            'target': 'this',
            'template': '',
            'swap': 'inner', // default swap
            'after': '',
            'before': ''
        })) {
            if (transformation.hasOwnProperty(property)) {
                properties[property] = transformation[property];
            } else if (defaultValue !== '' && !properties.hasOwnProperty(property)) {
                properties[property] = defaultValue;
            }
        }
    }

    sequenceTasks(helperFragment, target, properties) {
        if (properties.hasOwnProperty('before') &&
            properties.before !== "") {
            this.runSubtasks(properties.before)
        }

        this.search4ElemTasks(helperFragment);
        this.swapContent(helperFragment, target, properties.swap);

        if (properties.hasOwnProperty('after') &&
            properties.after !== "") {
            this.runSubtasks(properties.after)
        }

        // Executes another task in the same event after swap the content.
        if (properties.hasOwnProperty('next') &&
            properties.next !== "") {
            this.runNextTask(target, properties.next);
        }
    }

    thisElement(element, dataSelector, data) {
        // The element must have the name and value attribute.
        const selectores = dataSelector.split(/\, */);
        let remainer = [];
        for (const selector of selectores) {
            if (selector === 'this') {
                if (element.hasAttribute('name') && element.name !== "") {
                    data[element.name] = element.hasAttribute('value') ? element.value : "";
                }
                continue;
            }
            remainer.push(selector)
        }
        return remainer.join(',');
    }

    async templateManager(target, properties, input, data) {
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

        const helperFragment = this.buildFragment(input, data, innerTemplate);
        if (helperFragment === null) {
            throw new Error(`An error happened while processing the "${properties.template}" template`);
        }

        this.sequenceTasks(helperFragment, target, properties);
    }

    setFinalTarget(eventTarget, propertyTarget) {
        if (propertyTarget === 'this') {
            return eventTarget;
        }
        const target = document.querySelector(propertyTarget)
        if (target === null) {
            throw new Error(`Target "${propertyTarget}" not exist!`);
        }
        return target;
    }

    async setTemplateData(eventTarget, properties, event) {

        // Exposes the input data (name=value) selected by the
        // "collect-data" to be available in the templates like "data".
        let inputData = {}
        if (properties.hasOwnProperty('collect-data')) {
            const selector = this.thisElement(eventTarget, properties['collect-data'], inputData);
            if (selector.length > 0) {
                const collectFromElems = document.querySelectorAll(selector);
                for (const collectFromElem of collectFromElems) {
                    this.collectBodyData(collectFromElem, inputData);
                }
            }
        }

        // If the "src-file" property is defined, fetch the data.
        const jsonData = await (async function (_this) {
            if (properties.hasOwnProperty('src-file')) {
                return await _this.getResource(properties['src-file']);
            }
            return {};
        }(this));


        if (properties.hasOwnProperty('function')) {
            if (!this.custom_functions.hasOwnProperty(properties['function'])) {
                throw new Error(`The registered function "${properties.function}" not exist!`);
            }
            // if (event === undefined) {
            //     console.log('function with undefined event...');
            //     this.custom_functions[properties['function']](inputData, jsonData);
            // } else {
            //     console.log('function with event...');
            //     this.custom_functions[properties['function']](event, inputData, jsonData);
            // }
            this.custom_functions[properties['function']](event, inputData, jsonData);
        }

        // If the task has a template and target
        if (properties.hasOwnProperty('template') &&
            properties.hasOwnProperty('target') &&
            properties.target != '') {
            this.templateManager(this.setFinalTarget(eventTarget, properties.target),
                properties, inputData, jsonData);
        }
    }

    async processEvent(event, properties) {

        // replace with custom attributes
        // the action can exist together with the attribute and
        // is used by default when the attribute is not defined.
        for (const key of [
            'action',
            'method',
            'src-file',
            'swap',
            'target',
            'then',
            'after',
            'before',
            'next',
            'error'
        ]) {
            const property = 'attribute-'.concat(key);
            if (properties.hasOwnProperty(property) &&
                event.target.hasAttribute(properties[property]) &&
                event.target.getAttribute(properties[property]) !== "") {
                properties[key] = event.target.getAttribute(properties[property]);
            }
        }

        // Execute subtasks "then" as soon as possible!
        // Useful for example to show a loader.
        if (properties.hasOwnProperty('then') &&
            properties.then !== "") {
            this.runSubtasks(properties.then)
        }

        // In events without action and method,
        // the target can be replaced with templates.
        if (!(properties.hasOwnProperty('action') &&
            properties.hasOwnProperty('method'))) {
            this.setTemplateData(event.target, properties, event);
            return;
        }

        // event.preventDefault();

        let bodyData = {};
        if (properties.trigger === 'submit') {
            const formElem = event.target.closest('form');
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

            if (event.target.name !== '') {
                bodyData[event.target.name] = event.target.value;
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

        // If an error happens replaces the current task
        // with the error task, if it exists.
        if (properties.hasOwnProperty('error') && block.error) {
            properties = this.tasks[properties['error']];
            if (properties.hasOwnProperty('message')) {
                block.data = properties['message'];
            }
        }

        this.setTransformation(properties, block.transformation);

        const finalTarget = this.setFinalTarget(event.target, properties.target);

        // if data is json
        if (typeof block.data === 'object') {

            // with templates
            if (properties.hasOwnProperty('template')) {
                this.templateManager(finalTarget, properties, {}, block.data);
            }

        } else if (typeof block.data === 'string' && block.data !== "") {

            const helperFragment = function (_this) {
                const helperElem = document.createElement('div');
                helperElem.innerHTML = block.data;

                _this.reScript(helperElem);

                return helperElem;
            }(this);

            this.sequenceTasks(helperFragment, finalTarget, properties);

        } else {
            throw new Error("There is no data or text for the transformation");
        }
    }

    async setTask(element) {

        // It is possible to process several tasks as long
        // as the trigger for each task is different.
        const elementTasks = element.dataset.tasks.split(/ +/);

        for (const task of elementTasks) {
            if (!this.tasks.hasOwnProperty(task)) {
                throw new Error(`The task "${task}" not exist in tasks file!`);
                // continue;
            }

            console.log("Task:", task);

            // const properties = this.tasks[task];
            // Leave original tasks intact
            const properties = structuredClone(this.tasks[task]);

            if (properties.hasOwnProperty('attribute-trigger') &&
                element.hasAttribute(properties['attribute-trigger']) &&
                element.getAttribute(properties['attribute-trigger']) !== "") {
                properties['trigger'] = element.getAttribute(properties['attribute-trigger']);
            }

            if (!properties.hasOwnProperty('disabled')) {
                properties['disabled'] = false;
            }

            // custom event
            if (properties.trigger === 'init') { // fired after page loaded
                if (properties.disabled === false) {
                    // https://developer.mozilla.org/en-US/docs/Web/Events/Creating_and_triggering_events
                    // Create 'init' event
                    const event = new CustomEvent('init', {
                        bubbles: true,
                        cancelable: true,
                    });

                    let _this = this;
                    element.addEventListener('init', function (e) {
                        e.preventDefault();
                        if (properties.disabled === false) {
                            _this.processEvent(e, properties);
                        }
                    });
                    element.dispatchEvent(event);
                }
                continue;
            }

            // set the default trigger property
            if (!(properties.hasOwnProperty('trigger') &&
                this.triggers.has(properties.trigger))) {

                properties.trigger = function () {
                    // if submit form
                    if (element.nodeName === 'FORM') {
                        return 'submit';
                    }

                    // if a button
                    if (element.nodeName === 'BUTTON') {
                        return (element.type === 'submit') ? 'submit' : 'click';
                    }

                    // input type button
                    if (element.nodeName === 'INPUT' && element.type === 'button') {
                        return 'click';
                    }

                    throw new Error(`No trigger defined for "${task}"!`);
                }();
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
                if (properties.disabled === false) {
                    this.processEvent(event, properties);
                }
            });
        }
    }

    async getDataTasks() {
        const inlineTasks = document.querySelectorAll('script[data-tasktable]');
        for (const taskElem of inlineTasks) {
            if (taskElem.type.toLowerCase() !== 'application/json') {
                throw new Error(`Wrong mime-type "${taskElem.type}" for element tasks!`);
            }
            if (taskElem.hasAttribute('src') && taskElem.src !== "") {
                // get tasks from JSON file
                const jsonData = await (async function (_this) {
                    return await _this.getResource(taskElem.src);
                }(this));
                Object.assign(this.tasks, jsonData);
                continue;
            }

            // get inline task
            const jsonData = JSON.parse(taskElem.text);
            Object.assign(this.tasks, jsonData);
        }
    }

    function_register(name, func) {
        this.custom_functions[name] = func;
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

        this.getDataTasks().then(() => {
            // console.log(this.tasks);
            if (Object.keys(this.tasks).length >= 0) {
                this.search4ElemTasks(targetNode[0]);
            }
        });
    }

}

export { Secutio };

// const secutio = new Secutio();
// secutio.init();
