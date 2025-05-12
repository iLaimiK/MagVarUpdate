/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/function.ts":
/*!*************************!*\
  !*** ./src/function.ts ***!
  \*************************/
/***/ ((module, exports, __webpack_require__) => {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__(/*! ./main */ "./src/main.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, main_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", ({ value: true }));
    exports.trimQuotesAndBackslashes = trimQuotesAndBackslashes;
    exports.getLastValidVariable = getLastValidVariable;
    exports.updateVariables = updateVariables;
    exports.handleResponseMessage = handleResponseMessage;
    function trimQuotesAndBackslashes(str) {
        // Regular expression to match backslashes and quotes at the beginning and end
        return str.replace(/^[\\"' ]*(.*?)[\\"' ]*$/, '$1');
    }
    function extractSetCommands(inputText) {
        const results = [];
        // 首先匹配整个 _.set 调用
        const pattern = /_\.set\(([\s\S]*?)\);\s*(?:\/\/(.*?))?(?:\n|$|\r)/g;
        let match;
        while ((match = pattern.exec(inputText)) !== null) {
            const fullContent = match[0];
            const paramsString = match[1]; // 括号内的所有内容
            const comment = match[2] ? match[2].trim() : '';
            // 手动解析参数，处理嵌套结构
            const params = parseParameters(paramsString);
            if (params.length >= 3) {
                results.push({
                    fullMatch: fullContent,
                    path: trimQuotesAndBackslashes(params[0]),
                    oldValue: trimQuotesAndBackslashes(params[1]),
                    newValue: trimQuotesAndBackslashes(params[2]),
                    reason: comment,
                });
            }
            else if (params.length === 2) {
                /**
                 * _.set('时间', "09:15");
                 * _.set('地点', "朝槿咖啡店");
                 * 是的，哈基米有时候会不给老值
                 */
                results.push({
                    fullMatch: fullContent,
                    path: trimQuotesAndBackslashes(params[0]),
                    oldValue: trimQuotesAndBackslashes(params[1]),
                    newValue: trimQuotesAndBackslashes(params[1]),
                    reason: comment,
                });
            }
        }
        return results;
    }
    // 解析参数字符串，处理嵌套结构
    function parseParameters(paramsString) {
        const params = [];
        let currentParam = '';
        let inQuote = false;
        let quoteChar = '';
        let bracketCount = 0;
        let braceCount = 0;
        for (let i = 0; i < paramsString.length; i++) {
            const char = paramsString[i];
            // 处理引号
            if ((char === '"' || char === "'") && (i === 0 || paramsString[i - 1] !== '\\')) {
                if (!inQuote) {
                    inQuote = true;
                    quoteChar = char;
                }
                else if (char === quoteChar) {
                    inQuote = false;
                }
            }
            // 处理方括号 (数组)
            if (char === '[')
                bracketCount++;
            if (char === ']')
                bracketCount--;
            // 处理花括号 (对象)
            if (char === '{')
                braceCount++;
            if (char === '}')
                braceCount--;
            // 处理参数分隔符
            if (char === ',' && !inQuote && bracketCount === 0 && braceCount === 0) {
                params.push(currentParam.trim());
                currentParam = '';
                continue;
            }
            currentParam += char;
        }
        // 添加最后一个参数
        if (currentParam.trim()) {
            params.push(currentParam.trim());
        }
        return params;
    }
    async function getLastValidVariable(startNum) {
        for (;;) {
            if (startNum < 0)
                break;
            var currentMsg = await getChatMessages(startNum);
            if (currentMsg.length > 0) {
                var variables = currentMsg[0].swipes_data[currentMsg[0].swipe_id];
                if (_.has(variables, 'stat_data')) {
                    return variables;
                }
            }
            --startNum;
        }
        return await getVariables();
    }
    function pathFix(path) {
        const segments = [];
        let currentSegment = '';
        let inQuotes = false;
        let quoteChar = '';
        for (let i = 0; i < path.length; i++) {
            const char = path[i];
            // Handle quotes
            if ((char === '"' || char === "'") && (i === 0 || path[i - 1] !== '\\')) {
                if (!inQuotes) {
                    inQuotes = true;
                    quoteChar = char;
                }
                else if (char === quoteChar) {
                    inQuotes = false;
                }
                else {
                    currentSegment += char;
                }
            }
            else if (char === '.' && !inQuotes) {
                segments.push(currentSegment);
                currentSegment = '';
            }
            else {
                currentSegment += char;
            }
        }
        if (currentSegment) {
            segments.push(currentSegment);
        }
        return segments.join('.');
    }
    async function updateVariables(current_message_content, variables) {
        var out_is_modifed = false;
        await eventEmit(main_1.variable_events.VARIABLE_UPDATE_STARTED, variables, out_is_modifed);
        var out_status = _.cloneDeep(variables);
        var matched_set = extractSetCommands(current_message_content);
        var variable_modified = false;
        for (const setCommand of matched_set) {
            var { path, newValue, reason } = setCommand;
            path = pathFix(path);
            if (_.has(variables.stat_data, path)) {
                const currentValue = _.get(variables.stat_data, path);
                //有时候llm会返回整个数组，处理它
                if (_.isString(newValue) &&
                    newValue.trim().startsWith('[') &&
                    newValue.trim().endsWith(']')) {
                    try {
                        const parsedArray = JSON.parse(newValue);
                        if (Array.isArray(parsedArray) && parsedArray.length > 0) {
                            newValue = parsedArray[0];
                        }
                    }
                    catch (error) {
                        console.error(`Error parsing JSON array for '${path}': ${error.message}`);
                    }
                }
                // Check the type of the current value
                if (typeof currentValue === 'number') {
                    // If the current value is a number, convert the new value to a number
                    const newValueNumber = Number(newValue);
                    const oldValue = currentValue;
                    _.set(variables.stat_data, path, newValueNumber);
                    const reason_str = reason ? `(${reason})` : '';
                    const display_str = `${oldValue}->${newValueNumber} ${reason_str}`;
                    _.set(out_status.stat_data, path, display_str);
                    variable_modified = true;
                    console.info(`Set '${path}' to '${newValueNumber}' ${reason_str}`);
                    await eventEmit(main_1.variable_events.SINGLE_VARIABLE_UPDATED, variables.stat_data, path, oldValue, newValueNumber);
                }
                else if (Array.isArray(currentValue) && currentValue.length === 2) {
                    // If the current value is of type ValueWithDescription<T>
                    const newValueParsed = typeof currentValue[0] === 'number'
                        ? Number(newValue)
                        : trimQuotesAndBackslashes(newValue);
                    const oldValue = _.cloneDeep(currentValue[0]);
                    currentValue[0] = newValueParsed;
                    _.set(variables.stat_data, path, currentValue);
                    const reason_str = reason ? `(${reason})` : '';
                    const display_str = `${oldValue}->${newValue} ${reason_str}`;
                    _.set(out_status.stat_data, path, display_str);
                    variable_modified = true;
                    console.info(`Set '${path}' to '${newValueParsed}' ${reason_str}`);
                    // Call the onVariableUpdated function after updating the variable
                    await eventEmit(main_1.variable_events.SINGLE_VARIABLE_UPDATED, variables.stat_data, path, oldValue, newValueParsed);
                }
                else {
                    // Otherwise, set the new value directly
                    const trimmedNewValue = trimQuotesAndBackslashes(newValue);
                    const oldValue = _.cloneDeep(currentValue);
                    _.set(variables.stat_data, path, trimmedNewValue);
                    const reason_str = reason ? `(${reason})` : '';
                    const display_str = `${oldValue}->${trimmedNewValue} ${reason_str}`;
                    _.set(out_status.stat_data, path, display_str);
                    variable_modified = true;
                    console.info(`Set '${path}' to '${trimmedNewValue}' ${reason_str}`);
                    await eventEmit(main_1.variable_events.SINGLE_VARIABLE_UPDATED, variables.stat_data, path, oldValue, trimmedNewValue);
                }
            }
            else {
                const display_str = `undefined Path: ${path}->${newValue} (${reason})`;
                console.error(display_str);
            }
        }
        variables.display_data = out_status.stat_data;
        await eventEmit(main_1.variable_events.VARIABLE_UPDATE_ENDED, variables, out_is_modifed);
        return variable_modified || out_is_modifed;
    }
    async function handleResponseMessage() {
        const last_message = await getLastMessageId();
        var last_chat_msg_list = await getChatMessages(last_message);
        if (last_chat_msg_list.length > 0) {
            var current_chat_msg = last_chat_msg_list[last_chat_msg_list.length - 1];
            if (current_chat_msg.role != 'assistant')
                return;
            var content_modified = false;
            var current_message_content = current_chat_msg.message;
            //更新变量状态，从最后一条之前的取，local优先级最低
            const variables = await getLastValidVariable(last_message - 1);
            if (!_.has(variables, 'stat_data')) {
                console.error('cannot found stat_data.');
                return;
            }
            // 使用正则解析 _.set(${path}, ${newvalue});//${reason} 格式的部分，并遍历结果
            var variable_modified = false;
            variable_modified =
                variable_modified || (await updateVariables(current_message_content, variables));
            if (variable_modified) {
                //更新到当前聊天
                await replaceVariables(variables);
            }
            await setChatMessage({ data: variables }, last_message, { refresh: 'none' });
            //如果是ai人物，则不插入
            if (!current_message_content.includes('<CharView')) {
                if (!current_message_content.includes('<StatusPlaceHolderImpl/>')) {
                    //替换状态为实际的显示内容
                    if (current_message_content.includes('<StatusPlaceHolder/>')) {
                        //const display_str = "```\n" + YAML.stringify(out_status.stat_data, 2) + "```\n";
                        //保证在输出完成后，才会渲染。
                        const display_str = '<StatusPlaceHolderImpl/>'; //status_entry.content;
                        //const display_str = "```\n" + vanilla_str + "```\n";
                        current_message_content = current_message_content.replace('<StatusPlaceHolder/>', display_str);
                        content_modified = true;
                    }
                    else {
                        //如果没有，则固定插入到文本尾部
                        const display_str = '<StatusPlaceHolderImpl/>'; //status_entry.content;
                        current_message_content += '\n\n' + display_str;
                        content_modified = true;
                    }
                }
            }
            if (content_modified) {
                console.info(`Replace content....`);
                await setChatMessage({ message: current_message_content }, last_message, {
                    refresh: 'display_and_render_current',
                });
            }
        }
        //eventRemoveListener(tavern_events.GENERATION_ENDED, hello);
    }
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/main.ts":
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
/***/ ((module, exports, __webpack_require__) => {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__(/*! ./function */ "./src/function.ts"), __webpack_require__(/*! ./variable_init */ "./src/variable_init.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, function_1, variable_init_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", ({ value: true }));
    exports.variable_events = void 0;
    eventOn(tavern_events.GENERATION_ENDED, function_1.handleResponseMessage);
    eventOn(tavern_events.MESSAGE_SENT, variable_init_1.initCheck);
    eventOn(tavern_events.GENERATION_STARTED, variable_init_1.initCheck);
    exports.variable_events = {
        SINGLE_VARIABLE_UPDATED: 'mag_variable_updated',
        VARIABLE_UPDATE_ENDED: 'mag_variable_update_ended',
        VARIABLE_UPDATE_STARTED: 'mag_variable_update_started',
    };
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/variable_init.ts":
/*!******************************!*\
  !*** ./src/variable_init.ts ***!
  \******************************/
/***/ ((module, exports, __webpack_require__) => {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__(/*! ./function */ "./src/function.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, function_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", ({ value: true }));
    exports.initCheck = initCheck;
    async function initCheck() {
        //generation_started 的最新一条是正在生成的那条。
        var last_chat_msg = [];
        try {
            (await getChatMessages(-2, { role: 'assistant' }));
        }
        catch (e) {
            //在第一行时，必定发生异常。
        }
        if (!last_chat_msg) {
            last_chat_msg = [];
        }
        if (last_chat_msg.length <= 0) {
            var first_msg = await getChatMessages(0);
            if (first_msg && first_msg.length > 0) {
                last_chat_msg = first_msg;
            }
            else {
                console.error('不存在任何一条消息，退出');
                return;
            }
        }
        var last_msg = last_chat_msg[0];
        //检查最近一条消息的当前swipe
        var variables = last_msg.swipes_data[last_msg.swipe_id];
        var lorebook_settings = await getLorebookSettings();
        var enabled_lorebook_list = lorebook_settings.selected_global_lorebooks;
        var char_lorebook = await getCurrentCharPrimaryLorebook();
        if (char_lorebook !== null) {
            enabled_lorebook_list.push(char_lorebook);
        }
        if (variables === undefined) {
            variables = { display_data: {}, initialized_lorebooks: [], stat_data: {} };
        }
        if (!_.has(variables, 'initialized_lorebooks')) {
            variables.initialized_lorebooks = [];
        }
        if (!variables.stat_data) {
            variables.stat_data = {};
        }
        var is_updated = false;
        for (const current_lorebook of enabled_lorebook_list) {
            if (variables.initialized_lorebooks.includes(current_lorebook))
                continue;
            variables.initialized_lorebooks.push(current_lorebook);
            var init_entries = (await getLorebookEntries(current_lorebook));
            for (const entry of init_entries) {
                if (entry.comment?.includes('[InitVar]')) {
                    try {
                        const jsonData = JSON.parse(entry.content);
                        variables.stat_data = _.merge(variables.stat_data, jsonData);
                    }
                    catch (e) {
                        console.error(`Failed to parse JSON from lorebook entry: ${e}`);
                        // @ts-ignore
                        toastr.error(e.message, 'Failed to parse JSON from lorebook entry', {
                            timeOut: 5000,
                        });
                        return;
                    }
                }
            }
            is_updated = true;
        }
        if (!is_updated) {
            return;
        }
        console.info(`Init chat variables.`);
        await insertOrAssignVariables(variables);
        for (var i = 0; i < last_msg.swipes.length; i++) {
            var current_swipe_data = _.cloneDeep(variables);
            await (0, function_1.updateVariables)(last_msg.swipes[i], current_swipe_data);
            await setChatMessage({ data: current_swipe_data }, last_msg.message_id, {
                refresh: 'none',
                swipe_id: i,
            });
        }
        const expected_settings = {
            /*预期设置*/
            context_percentage: 100,
            recursive: true,
        };
        const settings = await getLorebookSettings();
        if (_.isEqual(_.merge({}, settings, expected_settings), settings)) {
            setLorebookSettings(expected_settings);
        }
    }
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
//window.initCheck = initCheck;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/main.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=bundle.js.map