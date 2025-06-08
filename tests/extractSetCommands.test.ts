import { extractSetCommands } from '../src/function';

describe('extractSetCommands', () => {
    describe('基本功能测试', () => {
        test('提取简单的 _.set 调用', () => {
            const input = `_.set('name', 'John', 'Jane');//更新名字`;
            const result = extractSetCommands(input);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                fullMatch: `_.set('name', 'John', 'Jane');//更新名字`,
                path: 'name',
                oldValue: 'John',
                newValue: 'Jane',
                reason: '更新名字'
            });
        });

        test('处理两个参数的 _.set 调用', () => {
            const input = `_.set('时间', "09:15");//设置时间`;
            const result = extractSetCommands(input);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                fullMatch: `_.set('时间', "09:15");//设置时间`,
                path: '时间',
                oldValue: '09:15',
                newValue: '09:15',
                reason: '设置时间'
            });
        });

        test('提取多个 _.set 调用', () => {
            const input = `
                _.set('time', '08:00', '09:00');//更新时间
                _.set('location', '家', '公司');//更新位置
            `;
            const result = extractSetCommands(input);

            expect(result).toHaveLength(2);
            expect(result[0].path).toBe('time');
            expect(result[1].path).toBe('location');
        });
    });

    describe('嵌套括号处理', () => {
        test('处理参数中包含 _.set 的情况', () => {
            const input = `_.set('悠纪.想对user说的事', ["与希雅 在一起时，会邀请希雅做一些事情，是 出去喝一杯咖啡，接下来设置变量\\"_.set('当前事件',null,'yuki_relation_level1');//邀请希雅\\"，然后断章。"], []);//邀请已经发出并被接受，待办事项完成并清空。`;
            const result = extractSetCommands(input);

            expect(result).toHaveLength(1);
            expect(result[0].path).toBe('悠纪.想对user说的事');
            expect(result[0].reason).toBe('邀请已经发出并被接受，待办事项完成并清空。');
            // 验证没有错误地提取内部的 _.set
            expect(result[0].fullMatch).toContain('待办事项完成并清空。');
        });

        test('处理嵌套数组和对象', () => {
            const input = `_.set('data', {arr: [1, 2, {nested: "value)}"}]}, {arr: [3, 4]});//更新数据`;
            const result = extractSetCommands(input);

            expect(result).toHaveLength(1);
            expect(result[0].path).toBe('data');
            expect(result[0].reason).toBe('更新数据');
        });

        test('处理包含括号的字符串', () => {
            const input = `_.set('message', "Hello (world)", "Goodbye (world)");//更改消息`;
            const result = extractSetCommands(input);

            expect(result).toHaveLength(1);
            expect(result[0].oldValue).toBe('Hello (world)');
            expect(result[0].newValue).toBe('Goodbye (world)');
        });
    });

    describe('引号处理', () => {
        test('处理混合引号', () => {
            const input = `_.set("path", 'old"value', "new'value");//混合引号`;
            const result = extractSetCommands(input);

            expect(result).toHaveLength(1);
            expect(result[0].oldValue).toBe('old"value');
            expect(result[0].newValue).toBe("new'value");
        });

        test('处理转义引号', () => {
            const input = `_.set('path', "value with \\"quotes\\"", 'new value');//转义引号`;
            const result = extractSetCommands(input);

            expect(result).toHaveLength(1);
            //expect(result[0].oldValue).toBe('value with \\"quotes\\"');
        });

        test('处理反引号（模板字符串）', () => {
            const input = "_.set('template', `Hello ${name}`, `Goodbye ${name}`);//模板字符串";
            const result = extractSetCommands(input);

            expect(result).toHaveLength(1);
            expect(result[0].oldValue).toBe('Hello ${name}');
            expect(result[0].newValue).toBe('Goodbye ${name}');
        });
    });

    describe('注释处理', () => {
        test('处理无注释的情况', () => {
            const input = `_.set('name', 'old', 'new');`;
            const result = extractSetCommands(input);

            expect(result).toHaveLength(1);
            expect(result[0].reason).toBe('');
        });

        test('处理带空格的注释', () => {
            const input = `_.set('name', 'old', 'new'); // 这是一个注释`;
            const result = extractSetCommands(input);

            expect(result).toHaveLength(1);
            expect(result[0].reason).toBe('这是一个注释');
        });

        test('处理多行文本中的注释', () => {
            const input = `_.set('name', 'old', 'new');//第一个注释\n_.set('age', 20, 21);//第二个注释`;
            const result = extractSetCommands(input);

            expect(result).toHaveLength(2);
            expect(result[0].reason).toBe('第一个注释');
            expect(result[1].reason).toBe('第二个注释');
        });
    });

    describe('边界情况', () => {
        test('处理空输入', () => {
            const result = extractSetCommands('');
            expect(result).toHaveLength(0);
        });

        test('处理没有 _.set 的文本', () => {
            const input = 'This is just some regular text without set commands';
            const result = extractSetCommands(input);
            expect(result).toHaveLength(0);
        });

        test('处理不完整的 _.set 调用', () => {
            const input = `_.set('name'`; // 缺少闭括号
            const result = extractSetCommands(input);
            expect(result).toHaveLength(0);
        });

        test('处理缺少分号的 _.set 调用', () => {
            const input = `_.set('name', 'old', 'new')`; // 缺少分号
            const result = extractSetCommands(input);
            expect(result).toHaveLength(0);
        });

        test('处理参数不足的情况', () => {
            const input = `_.set('name');//只有一个参数`;
            const result = extractSetCommands(input);
            expect(result).toHaveLength(0);
        });
    });

    describe('复杂场景', () => {
        test('处理混合内容', () => {
            const input = `
                Some text before
                _.set('status', 'pending', 'active');//更新状态
                More text in between
                _.set('count', 0, 1);
                _.set('data', ["item with ); inside"], ["new item"]);//包含特殊字符
                Final text
            `;
            const result = extractSetCommands(input);

            expect(result).toHaveLength(3);
            expect(result[0].path).toBe('status');
            expect(result[1].path).toBe('count');
            expect(result[2].path).toBe('data');
            expect(result[2].oldValue).toBe('["item with ); inside"]');
        });

        test('处理实际的复杂案例', () => {
            const input = `
                用户说了一些话，然后系统需要更新变量。
                _.set('用户.心情', '平静', '开心');//因为收到了好消息
                _.set('系统.响应', ["需要处理的事项", "包含特殊字符);的内容"], ["已处理"]);//处理完成
                _.set('时间戳', '2024-01-01', '2024-01-02');
            `;
            const result = extractSetCommands(input);

            expect(result).toHaveLength(3);
            expect(result[0].reason).toBe('因为收到了好消息');
            expect(result[1].reason).toBe('处理完成');
            expect(result[2].reason).toBe('');
        });
    });
});
