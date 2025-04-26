
// @ts-ignore
import {getLastValidVariable, trimQuotesAndBackslashes} from "./function";
import {getDefaultData} from "./variable_init";

// @ts-ignore
function extractCombinedNumber(dateString: string): number {
    // 使用正则表达式匹配所有数字
    const matches = dateString.match(/\d+/g);

    // 如果找到匹配项，将所有数字连接起来，然后转换为数字
    if (matches) {
        return Number(matches.join(''));
    }

    // 如果没有匹配项，返回0或其他默认值
    return 0;
}

export function onVariableUpdated(stat_data: GameData, path: string, _oldValue: any, _newValue: any) : boolean
{
    var modified : boolean = false;
    if (path.includes('时段'))
    {
        //reset value.
        stat_data.user.剩余时间[0] = 2;
        if (stat_data.user.时段[0] == '早上') {
            stat_data.user.时段[0] = '上午';
        }
        if (stat_data.user.时段[0] == '上午')
            stat_data.备注[0] = "已经很晚了，刚刚大家都去休息了一夜，现在是早晨了，需要写过渡的文本哦。";
        modified = true;
    }
    return modified;
}

export async function preprocessStat(stat_data: GameData) : Promise<void>
{
    var allEvents : EventList = {
        "touka_ev1": 0,
        "touka_ev02": 0,
        "touka_ev03": 0,
        "touka_ev04": 0,
        "kuren_ev1": 0,
        "kuren_ev02": 0,
        "kuren_ev03": 0,
        "kuren_ev04": 0,
    };
    _.merge(allEvents, stat_data.经历);
    stat_data.经历 = allEvents;
    if (!_.has(stat_data, '暮莲.情欲值'))
    {
        stat_data.暮莲.情欲值 = 0;
        stat_data.透花.情欲值 = 0;
        stat_data.user.情欲值 = 0;

    }
}

/**
 * Updates the state of the application based on the provided variables.
 * Changes may include resetting notes, adjusting time periods, advancing days,
 * or triggering specific events based on current conditions.
 *
 * @param {Record<string, any>} variables - An object containing the state variables to be updated. This includes user information, time periods, current events, and facility data.
 * @return {Promise<boolean>} - Returns a promise resolving to a boolean indicating whether any modifications were made to the state.
 */
export async function updateState(variables: Record<string, any>) : Promise<boolean>
{
    var globalVariables = await getVariables({type: 'global'});
    if (_.get(globalVariables, '当前角色', '') != 'user')
        return false;//user以外的角色不会也不能进行时间的更新
    var modified : boolean = false;
    var nextDay = false;
    if (variables.stat_data.备注[0].length > 0)
    {
        variables.stat_data.备注[0] = "";
        modified = true;
    }
    if (variables.stat_data.user.剩余时间[0] == 0) {
        switch (variables.stat_data.user.时段[0]) {
            case '上午':
                variables.stat_data.user.时段[0] = '下午';
                break;
            case '下午':
                variables.stat_data.user.时段[0] = '晚上';
                break;
            case '晚上':
                variables.stat_data.user.时段[0] = '上午';
                variables.stat_data.备注[0] = "已经很晚了，刚刚大家都去休息了一夜，现在是早晨了，需要写过渡的文本哦。";
                nextDay = true;
                break;
        }
        modified = true;
        variables.stat_data.user.剩余时间[0] = 2;
    }
    if (nextDay)
    {
        switch (variables.stat_data.日期[0]) {
            case '周一':
                variables.stat_data.日期[0] = '周二';
                break;
            case '周二':
                variables.stat_data.日期[0] = '周三';
                break;
            case '周三':
                variables.stat_data.日期[0] = '周四';
                break;
            case '周四':
                variables.stat_data.日期[0] = '周五';
                break;
            case '周五':
                variables.stat_data.日期[0] = '周六';
                break;
            case '周六':
                variables.stat_data.日期[0] = '周日';
                break;
            case '周日':
                variables.stat_data.日期[0] = '周一';
                break;
        }
    }
    if (variables.stat_data.当前事件[0] == 'back_to_beginning')
    {
        backToBeginning();
    }
    if (variables.stat_data.当前事件[0] == 'clear_result')
    {
        clearResult();
        variables.stat_data.当前事件[0] = '';
        variables.stat_data.流星雨的回忆 = true;
        modified = true;
    }
    if (variables.stat_data.user.时段[0] === '上午' && variables.stat_data.日期[0] === '周五') {
        const facilities: Locations = variables.stat_data.设施信息 || {};
        const hasMalfunctions = Object.values(facilities).some((area: Area) =>
            Object.values(area).some((location: LocationStatus) => {
                const malfunction = location.malfunction[0] || ''; // Adjusting to access ValueWithDescription
                return trimQuotesAndBackslashes(malfunction).length > 0;
            })
        );
        if (hasMalfunctions) {
            variables.stat_data.当前事件[0] = 'final_event';
            modified = true;
        }
        else
        {
            if (!_.get(variables.stat_data, '流星雨的回忆', false)) {
                variables.stat_data.当前事件[0] = 'clear_event';
                modified = true;
            }
        }
    }

    return modified;
}

async function clearResult()
{
    function wrapWithFlowingStyle(input: string): string {
        const style = `<style>@keyframes flowing {0% { background-position: 0% 50%; }100% { background-position: 500% 50%; }}</style>`;

        const wrappedText = `<span style="font-size: 14px; font-weight: bold; animation: flowing 15s infinite linear; background: linear-gradient(90deg, #00BFFF, #1E90FF, #4169E1, #00FFFF, #00BFFF); background-size: 500% 100%; background-clip: text; -webkit-background-clip: text; color: transparent; text-shadow: 0 0 10px rgba(0, 191, 255, 0.3); letter-spacing: 2px; display: inline-block;">${input}</span>`;

        return `${style}${wrappedText}`;
    }
    const talkingTxt : string =
        `恭喜！
    你已经完成了 Moonlit Remnant 的主要故事，从设备的年久失修中拯救了 Lunaria。感谢您对这个作品的支持，接下来，你可以继续自由探索这个人物和故事。`;
    await triggerSlash(`/sendas name="Lunaria" ${wrapWithFlowingStyle(talkingTxt)}`);
}

async function backToBeginning()
{

    function wrapWithFlowingStyle(input: string): string {
        const style = `<style>@keyframes flowing {0% { background-position: 0% 50%; }100% { background-position: 500% 50%; }}</style>`;

        const wrappedText = `<span style="font-size: 24px; font-weight: bold; animation: flowing 3s infinite linear; background: linear-gradient(90deg, #00BFFF, #1E90FF, #4169E1, #00FFFF, #00BFFF); background-size: 500% 100%; background-clip: text; -webkit-background-clip: text; color: transparent; text-shadow: 0 0 10px rgba(0, 191, 255, 0.3); letter-spacing: 2px; display: inline-block;">${input}</span>`;

        return `${style}${wrappedText}`;
    }
    const yukiTalkings : string[] = [
        "你会回到过去，重新遇见那些对你来说重要的她们，透花，还有暮莲。你们会重新相识，重新生活在一起——那是我所珍惜的，也是你所珍惜的宝贵日常。" ,
        "透花她，嘴上不说，但心里总是孤独又敏感，很需要有人温柔地陪伴……如果可以，这一次，你多给她一点耐心吧。" ,
        "至于暮莲，看似坚强，实际上却习惯一个人默默承受一切。这一次，不要再让她一个人背负所有沉重了好吗？记住，要一直陪伴在她的左右呀。" ,
        "还有哦，这次请一定记得好好检查生态圈里每个房间和设备，就算再微小的隐患，都不要轻忽。" ,
        "不过呀，不必对自己太过严苛，因为累的时候，我也一直在你身边陪伴着你。" ,
        "无论如何，都要记住，重新来过并不是遗忘现在，而是将这些回忆和教训化作继续守护她们的力量。" ,
        "最重要的是，无论发生什么，请保留住你想要保护她们的这颗温柔的心。』"];


    await triggerSlash(`/sendas name="蓝色蝴蝶(SillyTavern)" "『即将清除聊天记录....如有必要，请在 '管理聊天记录->导出 jsonl 聊天文件' 中保存。』"`);
    const nowLastMessage = await getLastMessageId();

    var variables = await getLastValidVariable(nowLastMessage - 1);
    await triggerSlash(`/hide ${nowLastMessage}`);
    for (var i = 0; i < 30; i++)
    {
        await setChatMessage({message: "即将清除聊天记录....如有必要，请在 '管理聊天记录->导出 jsonl 聊天文件' 中保存。\n 倒计时：" + (30 - i)}, nowLastMessage, {refresh: "display_current"});
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    var totalMessages = await getLastMessageId() + 1;//从 0 开始;
    var index = 0;
    for (;;)
    {
        for (var j = 0; j < 10; j++) {
            if (totalMessages > 1) {
                await triggerSlash(`/delete 1`);
                totalMessages--;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (index < yukiTalkings.length)
        {
            await triggerSlash(`/sendas name="悠纪-蓝色蝴蝶" ${wrapWithFlowingStyle(yukiTalkings[index])}`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            totalMessages++;
            index++;
        }
        else
        {
                break;
        }
    }
    if (totalMessages > 1)
    {
        await triggerSlash(`/delete ${totalMessages - 1}`);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    totalMessages = 1;
    await triggerSlash(`/sendas name="Lunaria" "就在{{user}}即将完全回到过去节点的刹那，悠纪再次递出了曾经交给过他的红色发带，轻而慎重地系在他的手腕上："`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await triggerSlash(`/sendas name="悠纪" ${wrapWithFlowingStyle("这一次想起我的时候，不要再悲伤了。只要记住，这个红色发带里承载的，不只是我的寄托，更是你自己选择的意志。")}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    await triggerSlash(`/sendas name="悠纪" ${wrapWithFlowingStyle("好了，我们回去吧。再一次，去守护Lunaria，也守护我们所钟爱的人与世界。")}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    await triggerSlash(`/sendas name="悠纪" ${wrapWithFlowingStyle("去吧，我最重要的人。我会作为你的力量、你的勇气，一直陪伴在你的身边，相信你一定能守护好你珍视的这一切。")}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    await triggerSlash(`/sendas name="悠纪" ${wrapWithFlowingStyle("请再一次微笑着迎接她们，迎接属于你的幸福旅程吧。")}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    totalMessages += 5;
    if (totalMessages > 1)
    {
        await triggerSlash(`/delete ${totalMessages - 1}`);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    var stat_data : GameData = variables.stat_data;
    var default_data : GameData = getDefaultData();
    if (_.get(stat_data, '经历.kuren_ev1', 0) !== 0)
    {
        default_data.经历["kuren_ev1"] = 1;
        default_data.暮莲["好感度-user"][0] += 35;
    }
    if (_.get(stat_data, '经历.touka_ev1', 0) !== 0)
    {
        default_data.经历["touka_ev1"] = 1;
        default_data.透花["好感度-user"][0] += 35;
    }
    default_data.user.重要记忆 = stat_data.user.重要记忆;
    default_data.当前事件[0] = '';
    default_data.user.未来的印记 = '有时，user 的身边，会有蓝色的蝴蝶环绕，像是默默守护着ta';

    for (var i = 0; i < 2; i++) {
        await setChatMessage({data: {stat_data: default_data}}, 0, {refresh: 'none', swipe_id: i});
    }
}
