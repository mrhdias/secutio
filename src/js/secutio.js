/*
    secutio.js
    Author: Henrique Dias
    Last Modification: 2024-04-15 11:32:15
    Attention: This is work in progress

    References:
    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
    https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
    https://knockoutjs.com/
    https://dev.to/paulgordon/after-using-rawjs-im-never-touching-react-again-or-any-framework-vanilla-javascript-is-the-future-3ac1
    https://github.com/polight/lego
    https://web.dev/articles/custom-elements-v1

    Usage:

    // If using Node.js or another CommonJS environment
    const Secutio = require('./secutio');
    const app = new Secutio();
    app.init();

    <!-- If in a browser environment -->
    <script type="text/javascript" src="secutio.js"></script>
    <script>
        const app = new Secutio();
        app.init();
    </script>
*/

(function (global, factory) {
    if (typeof exports === 'object' && typeof module !== 'undefined') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        global.Secutio = factory();
    }
}(this, (function () {
    'use strict';

    class Secutio {

        constructor(parameters = {
            "tasks_attribute": "data-tasks",
            "start_element": "body"
        }) {

            // https://developer.mozilla.org/en-US/docs/Web/API/Element#events
            // https://developer.mozilla.org/en-US/docs/Web/API/Window/load_event
            // Some events to test
            this.triggers = new Set([
                'change',
                'click',
                'focus',
                'init', // custom
                'input',
                'keydown',
                'mouseenter',
                'mouseover',
                'mouseup',
                'mouseleave',
                'mousemove',
                'reset',
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
            this.callbacks = {};
            this.extensions = {};
        }

        fetchOptions(properties, data) {
            // https://developer.mozilla.org/en-US/docs/Web/API/fetch
            let options = {
                method: properties.hasOwnProperty('method') ? properties.method : 'get',
                cache: "no-cache",
                signal: AbortSignal.timeout(1000 *
                    (properties.hasOwnProperty('timeout') ? parseInt(properties.timeout, 10) : 300))
                // credentials: 'include',
                // mode: 'cors',
                // origin: 'http://localhost:808'
            };

            if (properties.method === 'post' &&
                Object.prototype.toString.call(data) === '[object FormData]') {
                // options['headers'] = {
                //    'Content-Type': 'multipart/form-data'
                // };
                options['body'] = data;
                return options;
            }

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

        async makeRequest(properties, data) {
            // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch

            // console.log('Body Data:', data, properties.action, properties.method);

            try {
                const response = await fetch(properties.action, this.fetchOptions(properties, data));

                let result = {
                    transformation: {},
                    data: undefined,
                    ok: response.ok,
                    status: response.status
                };

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
                return {
                    transformation: {},
                    data: undefined,
                    ok: false,
                    status: 0
                };
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

        async getResource(filepath, extensions) {
            // test if the extension is json
            const fileType = (() => {
                for (const extension of extensions) {
                    if (filepath.length > `.${extension}`.length && filepath.endsWith(`.${extension}`)) {
                        return extension;
                    }
                }
                throw new Error(`The ${filepath} file is not a valid file!`);
            })();

            const response = await fetch(filepath, {
                cache: "no-cache"
            });
            if (!response.ok) {
                console.error(`When fetching the file ${filepath}` +
                    ` happen an HTTP error! status: ${response.status} ${response.statusText}`);
            }
            response.fileType = fileType;
            return response;
        }

        swapContent(clone, target, swap) {
            if (target === null) {
                console.warn('no target to swap');
                return
            }

            if (clone === null) {
                if (swap === 'delete') {
                    target.remove();
                    return;
                }

                // remove all child nodes from target
                if (swap === 'clean') {
                    while (target.firstChild) {
                        target.removeChild(target.firstChild);
                    }
                    return;
                }

                // It exists only for convenience, but does
                // not make any transformations.
                // move to another location
                if (swap === 'none') {
                    return;
                }

                return;
            }

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
                return;
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

            throw new Error(`swap "${swap}" attribute not supported`);
        }

        propertyOverride(currentTarget, properties) {
            // replace with custom attributes
            // the action can exist together with the attribute and
            // is used by default when the attribute is not defined.
            // properties:
            // action, method, src-data, swap, target, then, after, before, next, error

            for (const key of Object.keys(properties)) {
                if (!key.startsWith('attribute-')) {
                    continue;
                }
                const property = key.substring('attribute-'.length);
                if (property.length > 1 && currentTarget.hasAttribute(properties[key])) {
                    properties[property] = currentTarget.getAttribute(properties[key]);
                }
            }
        }

        async runNextTask(taskEvent, tasksListStr) {

            const tasks = tasksListStr.split(/ +/);

            for (const task of tasks) {

                if (!this.tasks.hasOwnProperty(task)) {
                    throw new Error(`The next task "${task}" not exist in tasks file!`);
                }

                // target - The element that originally triggered the event.
                // currentTarget - The element that has the event listener attached to it.
                const properties = this.tasks[task];
                this.propertyOverride(
                    taskEvent.event.currentTarget !== null ?
                        taskEvent.event.currentTarget : taskEvent.event.target,
                    properties);

                if (!properties.hasOwnProperty('disabled')) {
                    properties['disabled'] = false;
                }

                if (properties.hasOwnProperty('trigger')) {
                    throw new Error(`The trigger property from "${task}" is not allowed in next task!`);
                }

                if (properties.disabled === false) {
                    if (!properties.hasOwnProperty('wait')) {
                        properties.wait = 0;
                    }
                    setTimeout(async () => {
                        await this.findResourcePath(taskEvent, properties);

                        if (properties.hasOwnProperty('next')) {
                            await this.runNextTask(taskEvent, properties.next);
                        }
                    }, properties.wait);
                }
            }
        }

        runSubtasks(taskEvent, tasksListStr) {

            const currentTarget = taskEvent.event.currentTarget !== null ?
                taskEvent.event.currentTarget : taskEvent.event.target;
            const subtasks = tasksListStr.split(/ +/);

            for (const subtask of subtasks) {

                if (!this.tasks.hasOwnProperty(subtask)) {
                    throw new Error(`The subtask "${subtask}" not exist in tasks file!`);
                }

                const properties = this.tasks[subtask];

                if (!properties.hasOwnProperty('selector')) {
                    properties['traverse'] = 'target';
                }

                for (const property in properties) {
                    if (![
                        'scroll-into',
                        'traverse',
                        'selector',
                        'remove',
                        'add'
                    ].includes(property)) {
                        throw new Error(`The property "${property}" in subtask "${subtask}" ` +
                            `is not allowed with property "selector"!`);
                    }
                }

                if (Object.prototype.toString.call(properties) !== '[object Object]') {
                    throw new Error(`The properties of subtask "${subtask}" is not a object!`);
                }

                const elements = (() => {
                    if (properties.hasOwnProperty('traverse')) {
                        if (properties.traverse === 'target') {
                            return [currentTarget];
                        }
                        if (properties.traverse === 'closest' &&
                            properties.selector !== '') {
                            const elem = currentTarget.closest(properties.selector);
                            return elem === null ? [] : [elem];
                        }
                    }
                    if (properties.selector !== '') {
                        return document.querySelectorAll(properties.selector);
                    }
                    throw new Error(`The properties of subtask "${subtask}" has a empty selector!`);
                })();

                // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
                if (properties.hasOwnProperty('scroll-into')) {
                    // console.log(properties.selector);
                    if (properties.selector[0] !== '#') {
                        throw new Error(`The value of the selector property to scroll-into of the "${subtask}" ` +
                            `subtask must start with the "#" character`);
                    }
                    elements[0].scrollIntoView(properties['scroll-into']);
                    continue;
                }

                // if empty removes all selected elements
                if (properties.hasOwnProperty('remove') &&
                    Object.keys(properties['remove']).length === 0) {
                    for (const element of elements) {
                        element.remove();
                    }
                    continue;
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
                            const classes = properties['remove']['class'].split(/ +/);
                            for (const c of classes) {
                                if (element.classList.contains(c)) {
                                    element.classList.remove(c);
                                }
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
                            const classes = properties['add']['class'].split(/ +/);
                            for (const c of classes) {
                                element.classList.add(c);
                            }
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

        async findElemWithTasks(parentNode) {
            if (parentNode.hasChildNodes()) {
                for (const node of parentNode.childNodes) {
                    // console.log('Search for tasks:', node.nodeType, node.nodeName);
                    if (node.nodeName !== 'TEMPLATE' &&
                        node.nodeName !== 'SCRIPT' &&
                        node.nodeType !== node.TEXT_NODE &&
                        node.nodeType !== node.COMMENT_NODE &&
                        node.nodeType !== node.DOCUMENT_FRAGMENT_NODE) {
                        // Order changed in 2024-03-22 19:11:10
                        if (node.hasChildNodes()) {
                            await this.findElemWithTasks(node);
                        }
                        if (node.hasAttribute(this.tasksAttribute)) {
                            await this.setTask(node);
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

        buildFragment(taskEvent) {

            const helper = document.createElement('div');
            try {
                // console.log('Source:', taskEvent.template);
                // The data from the registered callbacks is passed
                // to templates in taskEvent property data (taskEvent.result).
                if (!taskEvent.hasOwnProperty('template')) {
                    throw new Error(`The template not exist`);
                }
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval
                // const data = taskEvent.data;
                // helper.insertAdjacentHTML('afterbegin', eval('`' + taskEvent.template + '`'));
                // delete (taskEvent.template);
                // Code execution by the eval() function is a security risk,
                // so it has been removed and replaced with the following code:

                helper.insertAdjacentHTML('afterbegin', (() => {
                    const script = document.createElement('script');
                    script.type = "text/javascript";
                    script.id = "temporary-helper";
                    script.innerHTML = 'function populateTemplate(task) {const data = task.result; return `' + taskEvent.template + '`;}';
                    let count = 0;
                    let timeoutID = setInterval(() => {
                        if (count > 5 || document.getElementById("temporary-helper") === null) {
                            clearInterval(timeoutID);
                            if (count > 5) {
                                throw new Error(`The temporary helper already exist after 500ms!`);
                            }
                        }
                        count++;
                    }, 100);
                    document.body.appendChild(script);
                    return populateTemplate(taskEvent);
                })());
                delete (taskEvent.template);
                const tmp = document.getElementById("temporary-helper");
                if (tmp !== null) {
                    tmp.remove();
                }

            } catch (error) {
                console.error(error);
            }
            this.reScript(helper);

            // remove the element helper div element
            return helper;
        }

        async fetchTemplate(path) {
            try {
                const response = await fetch(path);
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
                'before': '',
                'is-template': false
            })) {
                if (transformation.hasOwnProperty(property)) {
                    properties[property] = transformation[property];
                } else if (defaultValue !== '' && !properties.hasOwnProperty(property)) {
                    properties[property] = defaultValue;
                }
            }
        }

        async sequenceTasks(helperFragment, taskEvent, properties) {

            if (properties.hasOwnProperty('before') &&
                properties.before !== "") {
                this.runSubtasks(taskEvent, properties.before)
            }

            await this.findElemWithTasks(helperFragment);

            const target = (properties.target === 'this') ?
                taskEvent.event.currentTarget : document.querySelector(properties.target);

            this.swapContent(helperFragment, target,
                properties.hasOwnProperty('swap') ? properties.swap : 'inner');

            if (properties.hasOwnProperty('after') &&
                properties.after !== "") {
                this.runSubtasks(taskEvent, properties.after)
            }
        }

        async templateManager(taskEvent, properties) {
            // console.log('Template Manager...');

            if (properties.template.length < 3) {
                throw new Error(`Short template name "${properties.template}"`);
            }

            taskEvent.template = await (async (_this) => {

                if (Array.from(properties.template)[0] === '#') {
                    const template = document.getElementById(properties.template.substring(1));
                    if (template === null) {
                        throw new Error(`Embedded template "${properties.template}" not exist`);
                    }
                    // console.log('Template Node Name:', template.content.children[0].nodeName);

                    // If a template has a table with literal templates inside,
                    // the code is removed from the table and placed outside and
                    // the template does not work!
                    // Fix use the "script" tag
                    //
                    /*
                    if (template.nodeName === 'TEMPLATE' &&
                        template.content.hasChildNodes() &&
                        template.content.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {

                        // decode the &lt; p&gt; strings back into real HTML
                        const textareaElem = document.createElement('textarea');
                        textareaElem.insertAdjacentHTML('afterbegin', template.innerHTML);

                        return textareaElem.value;
                    }
                    */

                    if (template.nodeName === 'SCRIPT' &&
                        template.type.toLowerCase() === 'text/template' &&
                        template.hasChildNodes()) {
                        return template.textContent;
                    }

                    throw new Error(`Invalid "${properties.template}" embedded template`);
                } else {
                    return _this.fetchTemplate(properties.template);
                }
            })(this);

            const helperFragment = this.buildFragment(taskEvent);
            if (helperFragment === null) {
                throw new Error(`An error happened while processing the "${properties.template}" template`);
            }

            return helperFragment;
        }

        async setTemplateData(taskEvent, properties) {

            // If the "src-data" property is defined, fetch the data to result.
            taskEvent.result = await (async (_this) => {
                if (properties.hasOwnProperty('src-data')) {
                    if (Array.from(properties['src-data'])[0] === '#') {
                        const srcData = document.getElementById(properties['src-data'].substring(1));
                        if (srcData === null) {
                            throw new Error(`Source data "${properties['src-data']}" not exist!`);
                        }

                        if (srcData.DOCUMENT_TYPE_NODE === Node.DOCUMENT_TYPE_NODE &&
                            srcData.nodeName === 'SCRIPT' &&
                            srcData.type === 'application/json') {
                            return JSON.parse(srcData.textContent);
                        }
                        throw new Error(`Invalid "${properties['src-data']}" embedded source data`);
                    } else {
                        const response = await _this.getResource(properties['src-data'], ['json', 'txt']);
                        taskEvent.ok = response.ok;
                        taskEvent.status = response.status;
                        return !response.ok ? response.statusText :
                            (response.fileType === 'json') ? response.json() : response.text();
                    }
                }
                // If the task does not have the src-data property,
                // it propagates the previous result to the next task.
                return taskEvent.result ||= {};
            })(this);

            if (properties.hasOwnProperty('callback')) {
                if (!this.callbacks.hasOwnProperty(properties.callback)) {
                    throw new Error(`The registered calback "${properties.callback}" not exist!`);
                }
                this.callbacks[properties.callback](taskEvent);
            }

            // If the task has a template and target
            if (properties.hasOwnProperty('template') &&
                properties.template != '' &&
                properties.hasOwnProperty('target') &&
                properties.target != '') {
                const helperFragment = await this.templateManager(taskEvent, properties);
                await this.sequenceTasks(helperFragment, taskEvent, properties);
            } else { // remember to watch this carefully

                const target = (properties.target === 'this') ?
                    taskEvent.event.currentTarget : document.querySelector(properties.target);
                if (target !== null) {
                    this.swapContent((() => {
                        if (typeof taskEvent.result === 'string') {
                            const helper = document.createElement('span');
                            const txtNode = document.createTextNode(taskEvent.result);
                            helper.append(txtNode);
                            return helper;
                        }
                        return null;
                    })(), target, properties.hasOwnProperty('swap') ? properties.swap : 'inner');
                }
            }
        }

        async processReqData(taskEvent, properties) {

            // console.log(`Task Event: Template: ${taskEvent.template} ` +
            //     `Result: ${taskEvent.result} Ok: ${taskEvent.ok} Status: ${taskEvent.status}`);

            // if a template is returned
            if (taskEvent.hasOwnProperty('template')) {
                const helperFragment = this.buildFragment(taskEvent);
                if (helperFragment === null) {
                    throw new Error('An error happened while processing the "remote" template from server');
                }
                return helperFragment;
            }

            if (!taskEvent.hasOwnProperty('result')) {
                throw new Error("There is no any data for the transformation");
            }

            // if data is json
            if (typeof taskEvent.result === 'object') {
                // console.log('json data from server...');

                // with templates
                if (properties.hasOwnProperty('template') &&
                    properties.template !== '') {
                    const helperFragment = await this.templateManager(taskEvent, properties);
                    return helperFragment;
                }

                throw new Error("There is no json data for the transformation");
            }

            // if (typeof taskEvent.result === 'string' && taskEvent.result !== "") {
            if (typeof taskEvent.result === 'string') {
                // console.log('raw data from server...');

                // with templates
                if (properties.hasOwnProperty('template') &&
                    properties.template !== '') {
                    const helperFragment = await this.templateManager(taskEvent, properties);
                    return helperFragment;
                }

                const helperFragment = ((_this) => {
                    const helperElem = document.createElement('div');
                    helperElem.innerHTML = taskEvent.result;

                    _this.reScript(helperElem);

                    return helperElem;
                })(this);

                return helperFragment;
            }

            throw new Error("There is no data for the transformation");
        }

        serialize(data) {
            let obj = {};
            for (const [key, value] of data) {
                if (obj[key] !== undefined) {
                    if (!Array.isArray(obj[key])) {
                        obj[key] = [obj[key]];
                    }
                    obj[key].push(value);
                } else {
                    obj[key] = value;
                }
            }
            return obj;
        }

        async prepareRequest(taskEvent, properties) {

            let bodyData = undefined;

            if (properties.hasOwnProperty('callback')) {
                if (!this.callbacks.hasOwnProperty(properties.callback)) {
                    throw new Error(`The registered callback "${properties.callback}" not exist!`);
                }
                const result = this.callbacks[properties.callback](taskEvent);
                if (result === false) {
                    if (properties.hasOwnProperty('next')) {
                        delete properties.next;
                    }
                    return;
                }
                bodyData = taskEvent.data;
            } else if (properties.hasOwnProperty('trigger') &&
                properties.trigger === 'submit') {
                const form = taskEvent.event.currentTarget.closest('form');
                if (form !== null) {
                    // https://developer.mozilla.org/en-US/docs/Web/API/FormData
                    const data = new FormData(form);
                    bodyData = (properties.method === 'post') ? data : this.serialize(data);
                }
            }

            // send data to the server and wait for the response
            const block = await this.makeRequest(properties, bodyData);
            // console.log('Make Request Result:', block.ok, block.status);

            taskEvent.ok = block.ok;
            taskEvent.status = block.status;

            // If an error happens replaces the current task
            // with the error task, if it exists.
            if (properties.hasOwnProperty('error') && !block.ok) {
                properties = this.tasks[properties['error']];
                if (properties.hasOwnProperty('message')) {
                    block.data = properties['message'];
                }
            }

            this.setTransformation(properties, block.transformation);

            if (properties['is-template'] == true) {
                taskEvent.template = block.data;
            } else {
                taskEvent.result = block.data;
            }

            const helperFragment = await this.processReqData(taskEvent, properties);
            await this.sequenceTasks(helperFragment, taskEvent, properties);
        }

        async findResourcePath(taskEvent, properties) {
            // Execute subtasks "then" as soon as possible!
            // Useful for example to show a loader.
            if (properties.hasOwnProperty('then') &&
                properties.then !== "") {
                this.runSubtasks(taskEvent, properties.then);
            }

            // Extensions
            if (properties.hasOwnProperty('extension')) {
                if (!properties['extension'].hasOwnProperty('name')) {
                    throw new Error('The registered extension has no "name" property!');
                }
                if (this.extensions.hasOwnProperty(properties['extension']['name'])) {
                    if (!this.extensions.hasOwnProperty(properties['extension']['name'])) {
                        throw new Error(`The registered extension "${properties['extension']['name']}" not exist!`);
                    }
                    this.extensions[properties['extension']['name']](taskEvent, properties);
                    return;
                }
            }

            if (properties.hasOwnProperty('action')) {
                // get data from server
                if (properties.action === '') {
                    throw new Error('Empty action');
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

                await this.prepareRequest(taskEvent, properties);

                return;
            }

            // In events without action, the target can be replaced with templates.
            await this.setTemplateData(taskEvent, properties);
        }

        async processEvent(taskEvent, properties) {

            this.propertyOverride(taskEvent.event.currentTarget, properties);

            await this.findResourcePath(taskEvent, properties);

            // Executes another task in the same event after swap the content.
            if (properties.hasOwnProperty('next') &&
                properties.next !== "") {
                await this.runNextTask(taskEvent, properties.next);
            }
        }

        setDefaultTrigger(element) {
            // set the default trigger property

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

            return null;
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

                // console.log("Task:", task);

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
                if (!properties.hasOwnProperty('prevent')) {
                    properties['prevent'] = true;
                }

                // custom event
                if (properties.trigger === 'init') { // fired after fragment loaded
                    if (properties.disabled === false) {
                        // https://developer.mozilla.org/en-US/docs/Web/Events/Creating_and_triggering_events
                        // Create 'init' event
                        element.addEventListener('init', async (e) => {
                            if (properties.prevent) {
                                e.preventDefault();
                            }
                            if (properties.disabled === false) {
                                try {
                                    await this.processEvent({
                                        event: e
                                    }, properties);
                                } catch (error) {
                                    console.log(`Error for "${task}": ${error}`);
                                }
                            }
                        });
                        // After the addEventListener to associate the target
                        // and currentTarget, if not it is null.
                        const event = new CustomEvent('init', {
                            bubbles: true,
                            cancelable: true
                        });
                        element.dispatchEvent(event);
                    }
                    continue;
                }

                if (properties.hasOwnProperty('trigger')) {
                    if (!this.triggers.has(properties.trigger)) {
                        throw new Error(`The "${properties.trigger}" trigger is not allowed yet!`);
                    }
                } else {
                    // set the default trigger property
                    properties.trigger = this.setDefaultTrigger(element);
                    if (properties.trigger === null) {
                        throw new Error(`No trigger defined for "${task}"!`);
                    }
                }

                // https://developer.mozilla.org/en-US/docs/Web/API/Document/scroll_event
                // https://developer.mozilla.org/en-US/docs/Web/API/Element/scroll_event

                element.addEventListener(properties.trigger, async (event) => {
                    if (properties.prevent) {
                        event.preventDefault();
                    }
                    if (properties.disabled === false) {
                        try {
                            await this.processEvent({
                                event: event
                            }, properties);
                        } catch (error) {
                            console.log(`Error for "${task}": ${error}`);
                        }
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
                    const jsonData = await (await this.getResource(taskElem.src, ['json'])).json();
                    Object.assign(this.tasks, jsonData);
                    continue;
                }
                // get inline task
                const jsonData = JSON.parse(taskElem.text);
                Object.assign(this.tasks, jsonData);
            }
        }

        callback_register(name, func) {
            this.callbacks[name] = func;
        }

        extension_register(name, func) {
            this.extensions[name] = func;
        }

        init() {

            const targetNode = document.getElementsByTagName(this.startElement);

            // https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
            // begin mutation observer
            // for future use
            //
            // const config = {
            //    childList: true,
            //    subtree: true
            // };
            //
            // const callback = (mutations, observer) => {
            //     mutations.forEach(mutation => {
            //         if (mutation.type === "childList") {
            //
            //             for (const addedNode of mutation.addedNodes) {
            //                 // on added
            //                 console.log("Added Nodes...");
            //             }
            //
            //             for (const removedNode of mutation.removedNodes) {
            //                 // on removed
            //                 console.log("Removed Nodes...");
            //             }
            //
            //             if (mutation.target.childNodes.length === 0) {
            //                 observer.disconnect();
            //             }
            //         }
            //     });
            // }
            //
            // const observer = new MutationObserver(callback);
            // observer.observe(targetNode[0], config);
            // end mutation observer

            this.getDataTasks().then(async () => {
                // console.log(this.tasks);
                if (Object.keys(this.tasks).length >= 0) {
                    await this.findElemWithTasks(targetNode[0]);
                }
            });
        }
    }

    return Secutio;
})));