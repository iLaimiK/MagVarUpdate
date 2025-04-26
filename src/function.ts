

import {variable_events} from "./main";

export function trimQuotesAndBackslashes(str: string): string {
  // Regular expression to match backslashes and quotes at the beginning and end
  return str.replace(/^[\\"' ]*(.*?)[\\"' ]*$/, '$1');
}

// @ts-ignore
function clamp(num: number, min = 0, max = 5) {
    return Math.min(Math.max(num, min), max);
}

/**
 * 从大字符串中提取所有 .set(${path}, ${new_value});//${reason} 格式的模式
 * 并解析出每个匹配项的路径、新值和原因部分
 */
interface SetCommand {
    fullMatch: string;
    path: string;
    oldValue: string;
    newValue: string;
    reason: string;
}

function extractSetCommands(inputText: string): SetCommand[] {
    const results: SetCommand[] = [];

    // 首先匹配整个 _.set 调用
    const pattern = /_\.set\(([\s\S]*?)\);\s*(?:\/\/(.*?))?(?:\n|$)/g;

    let match;
    while ((match = pattern.exec(inputText)) !== null) {
        const fullContent = match[0];
        const paramsString = match[1]; // 括号内的所有内容
        const comment = match[2] ? match[2].trim() : "";

        // 手动解析参数，处理嵌套结构
        const params = parseParameters(paramsString);

        if (params.length >= 3) {
            results.push({
                fullMatch: fullContent,
                path: trimQuotesAndBackslashes(params[0]),
                oldValue: trimQuotesAndBackslashes(params[1]),
                newValue: trimQuotesAndBackslashes(params[2]),
                reason: comment
            });
        }
    }

    return results;
}

// 解析参数字符串，处理嵌套结构
function parseParameters(paramsString: string): string[] {
    const params: string[] = [];
    let currentParam = '';
    let inQuote = false;
    let quoteChar = '';
    let bracketCount = 0;
    let braceCount = 0;

    for (let i = 0; i < paramsString.length; i++) {
        const char = paramsString[i];

        // 处理引号
        if ((char === '"' || char === "'") && (i === 0 || paramsString[i-1] !== '\\')) {
            if (!inQuote) {
                inQuote = true;
                quoteChar = char;
            } else if (char === quoteChar) {
                inQuote = false;
            }
        }

        // 处理方括号 (数组)
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;

        // 处理花括号 (对象)
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;

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

export async function getLastValidVariable(startNum : number): Promise<Record<string, any>>
{
    for (;;)
    {
        if (startNum < 0)
            break;
        var currentMsg = await getChatMessages(startNum);
        if (currentMsg.length > 0)
        {
            var variables = currentMsg[0].swipes_data[currentMsg[0].swipe_id];
            if (_.has(variables, "stat_data")) {
                return variables;
            }
        }
        --startNum;
    }
    return await getVariables();
}

function pathFix(path: string) : string
{
    //部分情况下llm会偷懒，那咋办嘛
    const prefixes = ["central_control_tower", "eco_garden", "energy_hub", "data_center_zone"];
    for (const prefix of prefixes) {
        if (path.startsWith(prefix)) {
            return '设施信息.' + path;
        }
    }
    path = path.replace(/"/g, '');
    return path;
}

export async function updateVariables(current_message_content: string, variables: any) : Promise<boolean> {

    var out_is_modifed = false;
    await eventEmit(variable_events.VARIABLE_UPDATE_STARTED, variables, out_is_modifed);
    var out_status: Record<string, any> = _.cloneDeep(variables);
    var matched_set = extractSetCommands(current_message_content);
    var variable_modified = false;
    for (const setCommand of matched_set) {
        var {path, newValue, reason} = setCommand;
        path = pathFix(path);

        if (_.has(variables.stat_data, path)) {
            const currentValue = _.get(variables.stat_data, path);
            //有时候llm会返回整个数组，处理它
            if (_.isString(newValue) && newValue.trim().startsWith("[") && newValue.trim().endsWith("]")) {
                try {
                    const parsedArray = JSON.parse(newValue);
                    if (Array.isArray(parsedArray) && parsedArray.length > 0) {
                        newValue = parsedArray[0];
                    }
                } catch (error: any) {
                    console.error(`Error parsing JSON array for '${path}': ${error.message}`);
                }
            }
            // Check the type of the current value
            if (typeof currentValue === "number") {
                // If the current value is a number, convert the new value to a number
                const newValueNumber = Number(newValue);
                _.set(variables.stat_data, path, newValueNumber);
                const display_str = `${currentValue}->${newValueNumber} (${reason})`;
                _.set(out_status.stat_data, path, display_str);
                variable_modified = true;
                console.info(`Set '${path}' to '${newValueNumber}' (${reason})`);
            } else if (Array.isArray(currentValue) && currentValue.length === 2) {
                // If the current value is of type ValueWithDescription<T>
                const newValueParsed =
                    (typeof currentValue[0] === "number") ? Number(newValue) : trimQuotesAndBackslashes(newValue);
                currentValue[0] = newValueParsed;
                _.set(variables.stat_data, path, currentValue);
                const display_str = `${currentValue[0]}->${newValue}(${reason})`;
                _.set(out_status.stat_data, path, display_str);
                variable_modified = true;
                console.info(`Set '${path}' to '${newValueParsed}' (${reason})`);
                // Call the onVariableUpdated function after updating the variable
                await eventEmit(variable_events.SINGLE_VARIABLE_UPDATED, variables.stat_data, path, currentValue[0], newValueParsed);
            } else {
                // Otherwise, set the new value directly
                const trimmedNewValue = trimQuotesAndBackslashes(newValue);
                _.set(variables.stat_data, path, trimmedNewValue);
                const display_str = `${currentValue}->${trimmedNewValue} (${reason})`;
                _.set(out_status.stat_data, path, display_str);
                variable_modified = true;
                console.info(`Set '${path}' to '${trimmedNewValue}' (${reason})`);
            }
        } else {
            const display_str = `undefined Path: ${path}->${newValue} (${reason})`;
            console.error(display_str);
        }
    }

    variables.display_data = out_status.stat_data;
    await eventEmit(variable_events.VARIABLE_UPDATE_ENDED, variables, out_is_modifed);
    return variable_modified || out_is_modifed;
}

export async function handleResponseMessage() {


    const last_message = await getLastMessageId();
    var last_chat_msg_list = await getChatMessages(last_message);
    if (last_chat_msg_list.length > 0) {
        var current_chat_msg = last_chat_msg_list[last_chat_msg_list.length - 1];
        if (current_chat_msg.role != "assistant")
            return;
        var content_modified: boolean = false;
        var current_message_content = current_chat_msg.message;

        //更新变量状态，从最后一条之前的取，local优先级最低
        const variables = await getLastValidVariable(last_message - 1);
        if (!_.has(variables, "stat_data")) {
            console.error("cannot found stat_data.");
            return;
        }






// 使用正则解析 _.set(${path}, ${newvalue});//${reason} 格式的部分，并遍历结果
        var variable_modified: boolean = false;
        variable_modified = variable_modified || await updateVariables(current_message_content, variables);
        if (variable_modified) {
            //更新到当前聊天
            await replaceVariables(variables);
        }
        await setChatMessage({data: variables}, last_message, {refresh: 'none'});

        //如果是ai人物，则不插入
        if (!current_message_content.includes("<CharView")) {
            if (!current_message_content.includes("<StatusPlaceHolderImpl/>")) {
                //替换状态为实际的显示内容
                if (current_message_content.includes("<StatusPlaceHolder/>")) {
                    //const display_str = "```\n" + YAML.stringify(out_status.stat_data, 2) + "```\n";
                    //保证在输出完成后，才会渲染。
                    const display_str = "<StatusPlaceHolderImpl/>";//status_entry.content;
                    //const display_str = "```\n" + vanilla_str + "```\n";
                    current_message_content = current_message_content.replace("<StatusPlaceHolder/>", display_str);

                    content_modified = true;
                } else {
                    //如果没有，则固定插入到文本尾部
                    const display_str = "<StatusPlaceHolderImpl/>";//status_entry.content;
                    current_message_content += "\n\n" + display_str;
                    content_modified = true;
                }
            }
        }

        if (content_modified)
        {
            console.info(`Replace content....`);
            await setChatMessage({message: current_message_content}, last_message, {refresh: 'display_and_render_current'});
        }
    }

    //eventRemoveListener(tavern_events.GENERATION_ENDED, hello);
}

