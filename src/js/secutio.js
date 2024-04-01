/*
    secutio.js
    Author: Henrique Dias
    Last Modification: 2024-04-01 19:19:08
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
                method: properties.method,
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

        async getResource(filepath) {
            // test if the extension is json
            if (filepath.length <= '.json'.length || !filepath.endsWith('.json')) {
                throw new Error(`The ${filepath} file is not a valid JSON file!`);
            }

            const response = await fetch(filepath, {
                cache: "no-cache"
            });
            if (!response.ok) {
                throw new Error(`When fetching the file ${filepath} \
                happen an HTTP error! status: ${response.status} ${response.statusText}`);
            }

            return await response.json();
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

        async runNextTask(event, tasksListStr) {

            const tasks = tasksListStr.split(/ +/);

            for (const task of tasks) {

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
                    if (!properties.hasOwnProperty('wait')) {
                        properties.wait = 0;
                    }
                    setTimeout(async () => {
                        await this.findResourcePath(event, properties);

                        if (properties.hasOwnProperty('next')) {
                            await this.runNextTask(event, properties.next);
                        }
                    }, properties.wait);
                }
            }
        }

        runSubtasks(currentTarget, tasksListStr) {

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
                    if (!['traverse', 'selector', 'remove', 'add'].includes(property)) {
                        throw new Error(`The property "${property}" in subtask "${subtask}" is not allowed with property "selector"!`);
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
                            properties['selector'] !== '') {
                            return currentTarget.closest(properties['selector']);
                        }
                    }
                    if (properties['selector'] !== '') {
                        return document.querySelectorAll(properties['selector']);
                    }
                    throw new Error(`The properties of subtask "${subtask}" has a empty selector!`);
                })();

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

        buildFragment(event) {

            const helper = document.createElement('div');
            try {
                // console.log('Source:', event.template);
                // The data from the registered callbacks is passed
                // to templates in event property data (event.result).
                if (!event.hasOwnProperty('template')) {
                    throw new Error(`The template not exist`);
                }
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval
                // const data = event.data;
                // helper.insertAdjacentHTML('afterbegin', eval('`' + event.template + '`'));
                // delete (event.template);
                // Code execution by the eval() function is a security risk,
                // so it has been removed and replaced with the following code:

                helper.insertAdjacentHTML('afterbegin', (() => {
                    const script = document.createElement('script');
                    script.type = "text/javascript";
                    script.id = "temporary-helper";
                    script.innerHTML = 'function populateTemplate(event) {const data = event.result; return `' + event.template + '`;}';
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
                    return populateTemplate(event);
                })());
                delete (event.template);
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

        async sequenceTasks(helperFragment, event, properties) {

            if (properties.hasOwnProperty('before') &&
                properties.before !== "") {
                this.runSubtasks(event.currentTarget, properties.before)
            }

            await this.findElemWithTasks(helperFragment);

            const target = (properties.target === 'this') ?
                event.currentTarget : document.querySelector(properties.target);

            this.swapContent(helperFragment, target,
                properties.hasOwnProperty('swap') ? properties.swap : 'inner');

            if (properties.hasOwnProperty('after') &&
                properties.after !== "") {
                this.runSubtasks(event.currentTarget, properties.after)
            }
        }

        async templateManager(properties, event) {
            // console.log('Template Manager...');

            if (properties.template.length < 3) {
                throw new Error(`Short template name "${properties.template}"`);
            }

            event.template = await (async (_this) => {

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
                            template.content.hasChildNodes) {

                            // decode the &lt; p&gt; strings back into real HTML
                            const txt = document.createElement('textarea');
                            txt.insertAdjacentHTML('afterbegin', template.innerHTML);

                            return txt.value;
                        }

                        throw new Error(`Invalid "${properties.template}" embedded template`);
                    default:
                        throw new Error(`Invalid "${properties.template}" selected template`);
                }

            })(this);

            const helperFragment = this.buildFragment(event);
            if (helperFragment === null) {
                throw new Error(`An error happened while processing the "${properties.template}" template`);
            }

            return helperFragment;
        }

        async setTemplateData(event, properties) {

            // If the "src-data" property is defined, fetch the data to result.
            event.result = await (async (_this) => {
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
                        return await _this.getResource(properties['src-data']);
                    }
                }
                return {};
            })(this);

            if (properties.hasOwnProperty('callback')) {
                if (!this.callbacks.hasOwnProperty(properties.callback)) {
                    throw new Error(`The registered calback "${properties.callback}" not exist!`);
                }
                this.callbacks[properties.callback](event);
            }

            // If the task has a template and target
            if (properties.hasOwnProperty('template') &&
                properties.hasOwnProperty('target') &&
                properties.target != '') {

                const helperFragment = await this.templateManager(properties, event);
                await this.sequenceTasks(helperFragment, event, properties);
            }

            const target = (properties.target === 'this') ?
                event.currentTarget : document.querySelector(properties.target);
            if (target !== null) {
                this.swapContent(null, target,
                    properties.hasOwnProperty('swap') ? properties.swap : 'inner');
            }
        }

        async processReqData(event, properties) {

            // console.log(`Event: Template: ${event.template} Result: ${event.result} Ok: ${event.ok} Status: ${event.status}`);

            // if a template is returned
            if ('template' in event) {
                const helperFragment = this.buildFragment(event);
                if (helperFragment === null) {
                    throw new Error('An error happened while processing the "remote" template from server');
                }
                return helperFragment;
            }

            if (!('result' in event)) {
                throw new Error("There is no any data for the transformation");
            }

            // if data is json
            if (typeof event.result === 'object') {
                // console.log('json data from server...');

                // with templates
                if (properties.hasOwnProperty('template')) {
                    const helperFragment = await this.templateManager(properties, event);
                    return helperFragment;
                }

                throw new Error("There is no json data for the transformation");
            }

            // if (typeof event.result === 'string' && event.result !== "") {
            if (typeof event.result === 'string') {
                // console.log('raw data from server...');

                // with templates
                if (properties.hasOwnProperty('template')) {
                    const helperFragment = await this.templateManager(properties, event);
                    return helperFragment;
                }

                const helperFragment = ((_this) => {
                    const helperElem = document.createElement('div');
                    helperElem.innerHTML = event.result;

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

        async prepareRequest(event, properties) {

            let bodyData = undefined;

            if (properties.hasOwnProperty('callback')) {
                if (!this.callbacks.hasOwnProperty(properties.callback)) {
                    throw new Error(`The registered callback "${properties.callback}" not exist!`);
                }
                const result = this.callbacks[properties.callback](event);
                if (result === false) {
                    if (properties.hasOwnProperty('next')) {
                        delete properties.next;
                    }
                    return;
                }
                bodyData = event.data;
            } else if (properties.hasOwnProperty('trigger') &&
                properties.trigger === 'submit') {
                const form = event.currentTarget.closest('form');
                if (form !== null) {
                    // https://developer.mozilla.org/en-US/docs/Web/API/FormData
                    const data = new FormData(form);
                    bodyData = (properties.method === 'post') ? data : this.serialize(data);
                }
            }

            // send data to the server and wait for the response
            const block = await this.makeRequest(properties, bodyData);
            console.log('Make Request Result:', block.ok, block.status);

            event.ok = block.ok;
            event.status = block.status;

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
                event.template = block.data;
            } else {
                event.result = block.data;
            }

            const helperFragment = await this.processReqData(event, properties);
            await this.sequenceTasks(helperFragment, event, properties);
        }

        async findResourcePath(event, properties) {
            // Execute subtasks "then" as soon as possible!
            // Useful for example to show a loader.
            if (properties.hasOwnProperty('then') &&
                properties.then !== "") {
                this.runSubtasks(event.currentTarget, properties.then);
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
                    this.extensions[properties['extension']['name']](event, properties);
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

                await this.prepareRequest(event, properties);

                return;
            }

            // In events without action, the target can be replaced with templates.
            await this.setTemplateData(event, properties);
        }

        async processEvent(event, properties) {

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
                if (property.length > 1 && event.currentTarget.hasAttribute(properties[key])) {
                    properties[property] = event.currentTarget.getAttribute(properties[key]);
                }
            }

            await this.findResourcePath(event, properties);

            // Executes another task in the same event after swap the content.
            if (properties.hasOwnProperty('next') &&
                properties.next !== "") {
                await this.runNextTask(event, properties.next);
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
                                    await this.processEvent(e, properties);
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
                            await this.processEvent(event, properties);
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
                    const jsonData = await (async (_this) => {
                        return await _this.getResource(taskElem.src);
                    })(this);
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