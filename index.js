/**
 * Created by Riven on 2017/11/5 0005.
 */

const ArgumentType = Scratch.ArgumentType;
const BlockType = Scratch.BlockType;
const log = Scratch.log;

const tryGetLocalIp = () => {
    try {
        const ip = window.require('ip');
        return ip.address();
    } catch (e) {
        console.log(e);
        return 'kittenblock';
    }
};

const iotCommon = gen => {
    gen.includes_['iot'] = '#include "KBIot.h"';
    gen.definitions_['iot'] = 'KBIot iot(&Serial);';
    gen.setupCodes_['_serial'] = 'Serial.begin(115200);';
    gen.setupCodes_['iot'] = 'iot.init()';
    gen.loopCodes_['iot'] = 'iot.loop()';
};

const iotCommonPy = gen => {
    gen.functions_['iot_init'] = '# iot init process\nuart.write("\\n\\n")\nsleep(500)\nuart.write("WF 10 4 0 2 3 4 5\\n")\nsleep(500)\n';
}

const cmdTrim = cmd => {
    return cmd.replace(/"/g, '').trim();
}

class IOT {
    constructor (runtime){
        this.runtime = runtime;
        this.runtime.registerPeripheralExtension('IOT', this);
        // session callbacks

        this.decoder = new TextDecoder();
        this.mqttConnServer = this.mqttConnServer.bind(this);
        this.lineBuffer = '';
    }

    getInfo (){
        const localip = tryGetLocalIp();

        return {
            id: 'IoT',
            name: 'IoT',
            color1: '#1395BA',
            color2: '#107895',
            color3: '#107895',

            blocks: [
                {
                    opcode: 'mqttConnect',
                    blockType: BlockType.COMMAND,

                    text: 'Connect MQTT [SERVER] ID[CLIENTID]',
                    arguments: {
                        SERVER: {
                            type: ArgumentType.STRING,
                            defaultValue: localip
                        },
                        CLIENTID: {
                            type: ArgumentType.STRING,
                            defaultValue: 'robot01'
                        }
                    },
                    func: 'mqttConnect',
                    gen: {
                        arduino: this.connAr,
                        micropy: this.connPy
                    }
                },
                {
                    opcode: 'mqttConnectCloud',
                    blockType: BlockType.COMMAND,

                    text: 'Connect Cloud[SERVER] Access ID[USER] Pass[PASS] Device ID[CLIENTID]',
                    arguments: {
                        SERVER: {
                            type: ArgumentType.STRING,
                            defaultValue: 'kittenbot.cn'
                        },
                        CLIENTID: {
                            type: ArgumentType.STRING,
                            defaultValue: 'robot01'
                        },
                        USER: {
                            type: ArgumentType.STRING,
                            defaultValue: ''
                        },
                        PASS: {
                            type: ArgumentType.STRING,
                            defaultValue: ''
                        }
                    },
                    func: 'mqttConnectCloud',
                    gen: {
                        arduino: this.connAr,
                        micropy: this.connPy
                    }
                },
                {
                    opcode: 'connectAP',
                    blockType: BlockType.COMMAND,

                    text: 'connect AP [AP] pass[PASS]',
                    arguments: {
                        AP: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Home'
                        },
                        PASS: {
                            type: ArgumentType.STRING,
                            defaultValue: '12345'
                        }
                    },
                    func: 'noop',
                    gen: {
                        arduino: this.connApAr,
                        micropy: this.connApPy
                    }
                },
                {
                    opcode: 'mqttPub',
                    blockType: BlockType.COMMAND,

                    text: 'MQTT Publish [TOPIC] [DATA]',
                    arguments: {
                        TOPIC: {
                            type: ArgumentType.STRING,
                            defaultValue: '/hello'
                        },
                        DATA: {
                            type: ArgumentType.STRING,
                            defaultValue: 'helloworld'
                        }
                    },
                    func: 'mqttPub',
                    gen: {
                        arduino: this.pubAr,
                        micropy: this.pubPy
                    }
                },
                {
                    opcode: 'mqttSub',
                    blockType: BlockType.COMMAND,

                    text: 'MQTT Subscribe [TOPIC]',
                    arguments: {
                        TOPIC: {
                            type: ArgumentType.STRING,
                            defaultValue: '/hello'
                        }
                    },
                    func: 'mqttSub',
                    gen: {
                        arduino: this.subAr,
                        micropy: this.subPy
                    }
                },
                {
                    opcode: 'mqttGot',
                    blockType: BlockType.HAT,

                    text: 'MQTT Topic [TOPIC]',
                    arguments: {
                        TOPIC: {
                            type: ArgumentType.STRING,
                            defaultValue: '/hello'
                        }
                    },
                    isEdgeActivated: false,
                    func: 'mqttGot',
                    gen: {
                        arduino: this.mqttGotAr,
                        micropy: this.mqttGotPy
                    }
                },
                {
                    opcode: 'mqttData',
                    blockType: BlockType.REPORTER,

                    text: 'Topic Data [DATATYPE]',
                    arguments: {
                        DATATYPE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'String',
                            menu: 'datatype'
                        }
                    },
                    func: 'mqttData',
                    gen: {
                        arduino: this.mqttDataAr,
                        micropy: this.mqttDataPy
                    }
                },
                '---',
                {
                    opcode: 'iotwork',
                    blockType: BlockType.COMMAND,

                    text: 'Iot work@micropy',
                    func: 'noop',
                    gen: {
                        micropy: this.iotWork_py
                    }
                },
            ],
            menus: {
                datatype: ['String', 'Number', 'C_Str']
            },
            translation_map: {
                'zh-cn': {
                    mqttConnect: '连接MQTT 服务器[SERVER] ID[CLIENTID]',
                    mqttConnectCloud: '连接云[SERVER] 访问ID[USER] 访问秘钥[PASS] 设备ID [CLIENTID]',
                    connectAP: '连接 路由器[AP] 密码[PASS]',
                    mqttPub: 'MQTT 广播话题[TOPIC] 消息[DATA]',
                    mqttSub: 'MQTT 订阅话题[TOPIC]',
                    mqttGot: 'MQTT 收到话题[TOPIC]',
                    mqttData: '话题内容 [DATATYPE]',
                    datatype: {'String': '文本', 'Number': '数字', 'C_Str': 'C指针'}
                },
                'zh-tw': {
                    mqttConnect: '連接MQTT 伺服器[SERVER] ID[CLIENTID]',
                    mqttConnectCloud: '雲端服務器[SERVER] 訪問帳號ID[USER] 訪問密碼[PASS] 設備ID [CLIENTID]',
                    connectAP: '連接 路由器[AP] 密碼[PASS]',
                    mqttPub: 'MQTT 廣播話題[TOPIC] 消息[DATA]',
                    mqttSub: 'MQTT 訂閱話題[TOPIC]',
                    mqttGot: 'MQTT 收到話題[TOPIC]',
                    mqttData: '話題內容 [DATATYPE]',
                    datatype: {'String': '文本', 'Number': '數字', 'C_Str': 'C指針'}
                }
            }
        };
    }

    noop (){

    }

    mqttConnect (args) {
        const server = args.SERVER;
        const cid = args.CLIENTID;
        return this.mqttConnServer(`ws://${server}:9234`, cid);
    }

    mqttConnectCloud (args) {
        const server = args.SERVER;
        const cid = args.CLIENTID;
        const user = args.USER;
        const pass = args.PASS;
        return this.mqttConnServer(`ws://${server}:9234`, cid, user, pass);
    }

    mqttConnServer (host, cid, user, pass){
        return new Promise((resolve, reject) => {
            if (this.client){
                this.client.end();
            }
            const mqtt = window.require('mqtt');
            const option = {clientId: cid};
            if (user) option.username = user;
            if (user) option.password = pass;
            const client = mqtt.connect(host, option);
            client.retryCnt = 0;
            this.client = client;
            this.client.on('message', (topic, message) => {
                // message is Buffer
                // console.log(topic, message);
                window.vm.runtime.startHats('IoT_mqttGot', {TEXT: topic});
                this.mqttTopicData = message.toString('utf-8');
            });
            this.client.on('end', () => {
                console.log('mqtt end');
            });
            this.client.on('error', e => {
                console.log('mqtt err', e);
            });
            this.client.on('connect', connack => {
                client.retryCnt = 0;
                resolve();
            });
            this.client.on('reconnect', () => {
                client.retryCnt++;
                if (client.retryCnt > 5){
                    client.end();
                    reject('error: time out');
                }
            });
        });
    }

    mqttPub (args) {
        if (this.client){
            this.client.publish(args.TOPIC, args.DATA.toString());
        }
    }

    mqttSub (args) {
        if (this.client){
            this.client.subscribe(args.TOPIC);
        }
    }

    mqttGot (args) {
        // console.log("mqtt got" + args);
        return true;
    }

    mqttData (args) {
        return this.mqttTopicData;
    }

    connApAr (gen, block){
        iotCommon(gen);
        const ap = gen.valueToCode(block, 'AP');
        let pass = gen.valueToCode(block, 'PASS');
        if (gen.isNumber(pass)){
            pass = `"${pass}"`;
        }
        const code = `iot.connectAP(${ap}, ${pass})`;
        return code;
    }
    
    connApPy (gen, block){
        iotCommonPy(gen);
        const ap = gen.valueToCode(block, 'AP');
        let pass = gen.valueToCode(block, 'PASS');
        let cmd = cmdTrim(`WF 52 2 52 ${ap} ${pass}\\n`);
        return `uart.write("${cmd}")\n`;
    }

    connAr (gen, block){
        iotCommon(gen);
        const server = gen.valueToCode(block, 'SERVER');
        const cid = gen.valueToCode(block, 'CLIENTID');
        const user = gen.valueToCode(block, 'USER');
        const pass = gen.valueToCode(block, 'PASS');
        if (user){
            return `iot.mqttConect(${server}, ${cid}, ${user}, ${pass})`;
        } else {
            return `iot.mqttConect(${server}, ${cid})`;
        }
    }
    
    connPy (gen, block){
        iotCommonPy(gen);
        let cmd;
        const server = gen.valueToCode(block, 'SERVER');
        const cid = gen.valueToCode(block, 'CLIENTID');
        const user = gen.valueToCode(block, 'USER');
        const pass = gen.valueToCode(block, 'PASS');
        if (user){
            cmd = cmdTrim(`WF 15 4 15 ${server} ${cid} ${user} ${pass}\\n`);
        } else {
            cmd = cmdTrim(`WF 15 2 15 ${server} ${cid}\\n`);
        }
        return `uart.write("${cmd}")\n`;
    }

    pubAr (gen, block){
        iotCommon(gen);
        const topic = gen.valueToCode(block, 'TOPIC');
        const data = gen.valueToCode(block, 'DATA');
        return `iot.publish(${topic}, ${data})`;
    }
    
    pubPy (gen, block){
        iotCommonPy(gen);
        const topic = gen.valueToCode(block, 'TOPIC');
        const data = gen.valueToCode(block, 'DATA');
        let cmd =  cmdTrim(`WF 11 4 11 0 0 ${topic} ${data}\\n`);
        return `uart.write("${cmd}")\n`;
    }

    subAr (gen, block){
        iotCommon(gen);
        const topic = gen.valueToCode(block, 'TOPIC');
        return `iot.subscribe(${topic})`;
    }

    subPy (gen, block){
        iotCommonPy(gen);
        const topic = gen.valueToCode(block, 'TOPIC');
        let cmd = cmdTrim(`WF 12 2 0 ${topic} 0\\n`)
        return `uart.write("${cmd}")\n`;
    }

    mqttGotAr (gen, block){
        iotCommon(gen);
        const topic = gen.valueToCode(block, 'TOPIC');
        const callback_ = 'GOT' + topic.replace(/["']/g, '').replace(/\//g, '_');
        gen.setupCodes_[callback_] = `iot.regGot(${topic}, &${callback_})`;
        const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
        const code = gen.blockToCode(nextBlock);
        gen.functions_[callback_] = `\nvoid ${callback_}(String topicData){\n${code}\n}\n`;
        return '';
    }

    mqttGotPy (gen, block){
        iotCommonPy(gen);
        const topic = gen.valueToCode(block, 'TOPIC');
        const callback_ = 'GOT' + topic.replace(/["']/g, '').replace(/\//g, '_');
        const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
        let code = gen.blockToCode(nextBlock);
        code = code.split('\n').map(c => '\t'+c).join('\n');
        gen.functions_[callback_] = `\ndef ${callback_}(topicData):\n${code}`
        return '';
    }

    mqttDataAr (gen, block){
        const datatype = gen.valueToCode(block, 'DATATYPE');
        let code = 'topicData';
        if (datatype === 'Number'){
            code += '.toInt()';
        } else if (datatype === 'C_Str'){
            code += '.c_str()';
        }
        return [code, gen.ORDER_ATOMIC];
    }

    mqttDataPy (gen, block){
        const datatype = gen.valueToCode(block, 'DATATYPE');
        let code = 'topicData';
        return [code, gen.ORDER_ATOMIC];
    }
    
    iotWork_py (gen, block){
        iotCommonPy(gen);
        gen.functions_["iotserial"] = `linebuf = ''
def iotSerialWork():
    global linebuf
    if uart.any():
        a = uart.readline()
        linebuf += str(a, 'utf8')
        if linebuf.endswith('\\n'):
            tmp = linebuf.split(' ')
            linebuf = ''
            if tmp[0] == 'WF':
                if tmp[1] == '3' and tmp[3] == '5':
                    topic = tmp[4]
                    topic = topic.replace('/', '_')
                    data = tmp[5].strip()
                    cmdline = 'GOT%s(data)' %topic
                    eval(cmdline, globals(), {'data': data})`
        return `iotSerialWork()\n`;
    }

}
module.exports = IOT;
