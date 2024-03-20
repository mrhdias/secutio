/*
    websocket.js - secutio extension
    Author: Henrique Dias
    Last Modification: 2024-03-20 18:42:22

    References:
    https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API

    Usage:

    <script data-tasktable type="application/json">
    {
        "task-name-01": {
            "extension": {
                "name": "websocket",
                "connect": "ws://localhost:8080/test"
            },
            ...
        },
        "task-name-02": {
            "extension": {
                "name": "websocket",
                "connect": "ws://localhost:8080/echo",
                "function": "send-data",
                "element": "#send-data",
                "trigger": "click"
            },
            ...
        }
    }
    </script>

    <script type="text/javascript" src="./secutio.js"></script>
    <script type="text/javascript" src="./ext/websocket.js"></script>
    <script>
        const app = new Secutio();
        app.init();

        app.extension_register('websocket', wsExtension);

        app.function_register('send-data', ((socket) => {
            socket.send('Hello Server!');
        }));
    </script>
*/

const wsExtension = ((taskEvent, taskProperties) => {
    // Create WebSocket connection.

    const properties = taskProperties['extension'];

    if (properties['name'] !== 'websocket') {
        throw new Error('The extension name is not \"websocket\"!');
    }
    if (properties['connect'] === '') {
        throw new Error('The websocket extension \"connect\" property is empty');
    }

    const socket = new WebSocket(properties['connect']);

    const sendData = () => {
        if (properties.hasOwnProperty('function')) {
            if (properties['function'] === '') {
                throw new Error(`The websocket extension \"function\" property is empty!`);
            }
            app.custom_functions[properties['function']](socket);
        }
    };

    // Connection opened
    socket.addEventListener("open", async (e) => {
        // socket.send("Hello Server!");
        if (properties.hasOwnProperty('element')) {
            if (properties['element'] === '') {
                throw new Error(`The websocket extension \"element\" property is empty!`);
            }

            const element = document.querySelector(properties['element']);
            if (element !== null) {
                if (properties.hasOwnProperty('trigger')) {
                    if (properties['trigger'] === '') {
                        throw new Error(`The websocket extension \"trigger\" property is empty!`);
                    }
                } else {
                    properties['trigger'] = 'click';
                }

                element.addEventListener(properties['trigger'], sendData);
            }
        } else {
            sendData();
        }
    });

    // Listen for messages
    socket.addEventListener("message", async (e) => {
        // console.log('Event WebSocket:', e.data);
        taskEvent.result = e.data;
        delete (e.data);
        const helperFragment = await app.processReqData(taskEvent, taskProperties);
        await app.sequenceTasks(helperFragment, taskEvent, taskProperties);
    });
});