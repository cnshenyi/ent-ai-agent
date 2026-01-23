# Agent Skills 使用指南

## 适合本项目的推荐技能

基于你的耳鼻喉科医疗咨询项目，以下是推荐的技能及其用途：

### 1. PDF 处理技能 (anthropics/skills)

**用途**: 生成医疗咨询报告、病历记录PDF

**安装**:
```bash
npx skills add anthropics/skills
```

**使用示例**:
```typescript
// 在对话中调用
"请帮我生成一份PDF格式的咨询记录"

// 技能会自动处理并生成PDF文档
```

**适用场景**:
- 生成患者咨询记录PDF
- 导出就诊历史报告
- 创建医疗建议文档

---

### 2. Web Design Guidelines (vercel-labs/agent-skills)

**用途**: 优化界面设计，提升用户体验

**安装**:
```bash
npx skills add vercel-labs/agent-skills
```

**使用示例**:
```typescript
// 在开发时咨询
"请根据web设计最佳实践，优化我的医疗咨询界面"

// 技能会提供具体的设计建议
```

**适用场景**:
- 优化移动端界面布局
- 改进色彩搭配和可访问性
- 提升整体用户体验

---

### 3. Copywriting (coreyhaines31/marketingskills)

**用途**: 优化文案，提升用户沟通效果

**安装**:
```bash
npx skills add coreyhaines31/marketingskills
```

**使用示例**:
```typescript
// 优化提示文案
"帮我优化这个错误提示：'请允许使用麦克风权限'"

// 技能会提供更友好的文案建议
// 例如: "为了使用语音输入功能，需要您授权麦克风权限"
```

**适用场景**:
- 优化错误提示信息
- 改进用户引导文案
- 提升医疗建议的可读性

---

### 4. React Best Practices (vercel-labs/agent-skills)

**用途**: 优化React代码质量

**安装**:
```bash
npx skills add vercel-labs/agent-skills
```

**使用示例**:
```typescript
// 代码审查
"请检查我的React组件是否符合最佳实践"

// 技能会分析代码并提供改进建议
```

**适用场景**:
- 优化组件性能
- 改进状态管理
- 提升代码可维护性

---

## 实际应用案例

### 案例1: 生成咨询记录PDF

**场景**: 用户完成咨询后，想要保存PDF格式的记录

**实现步骤**:
1. 安装PDF技能: `npx skills add anthropics/skills`
2. 在代码中添加导出按钮
3. 调用技能生成PDF

**代码示例**:
```typescript
const exportToPDF = async () => {
  // 准备咨询记录数据
  const consultationData = {
    doctor: "许庚医生",
    date: new Date().toLocaleDateString('zh-CN'),
    messages: messages,
  };

  // 调用PDF技能
  // 在对话中: "请将这些咨询记录生成PDF"
};
```

---

### 案例2: 优化界面文案

**场景**: 改进语音识别权限提示

**原文案**:
```
"请允许使用麦克风权限"
```

**使用copywriting技能优化后**:
```
"为了更好地为您服务，我们需要使用您的麦克风进行语音识别。
您的隐私将得到严格保护，语音数据仅用于本次咨询。"
```

---

### 案例3: 界面设计优化

**场景**: 使用web-design-guidelines优化移动端布局

**优化建议**:
1. 增加触摸目标大小（最小44x44px）
2. 优化色彩对比度（符合WCAG标准）
3. 改进加载状态提示
4. 添加骨架屏

**实施**:
```typescript
// 优化按钮尺寸
<button className="min-h-[44px] min-w-[44px]">

// 改进加载状态
{loading && (
  <div className="flex items-center gap-2">
    <Spinner />
    <span>正在为您分析...</span>
  </div>
)}
```

---

## 技能调用流程

1. **安装技能**
   ```bash
   npx skills add <owner/repo>
   ```

2. **在对话中调用**
   - 直接描述需求
   - 技能会自动识别并执行

3. **查看结果**
   - 技能会返回处理结果
   - 可以进一步优化和调整

---

## 注意事项

1. **技能需要在支持的环境中运行**
   - Claude Code CLI
   - 支持MCP的环境

2. **某些技能可能需要额外配置**
   - API密钥
   - 环境变量

3. **技能调用是异步的**
   - 需要等待处理完成
   - 可能需要多轮对话

---

## 推荐的技能组合

针对你的医疗咨询项目，建议安装以下技能组合：

```bash
# 核心功能
npx skills add anthropics/skills        # PDF/文档处理

# 设计优化
npx skills add vercel-labs/agent-skills # React最佳实践 + 设计指南

# 文案优化
npx skills add coreyhaines31/marketingskills # 营销文案
```

---

## 下一步

1. 根据项目需求选择合适的技能
2. 安装并测试技能功能
3. 集成到现有工作流程中
4. 持续优化和改进

如需更多帮助，请访问: https://skills.sh
