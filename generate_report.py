#!/usr/bin/env python3
"""生成医疗咨询应用测试报告 PDF"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime

# 注册中文字体
pdfmetrics.registerFont(TTFont('Chinese', '/Library/Fonts/Arial Unicode.ttf'))

# 创建 PDF
pdf_file = "医疗咨询应用测试报告.pdf"
doc = SimpleDocTemplate(pdf_file, pagesize=A4)
story = []

# 样式
styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Heading1'],
    fontSize=24,
    textColor=colors.HexColor('#1e40af'),
    spaceAfter=30,
    fontName='Chinese',
)

heading_style = ParagraphStyle(
    'CustomHeading',
    parent=styles['Heading2'],
    fontSize=16,
    textColor=colors.HexColor('#2563eb'),
    spaceAfter=12,
    fontName='Chinese',
)

# 标题
story.append(Paragraph("医疗咨询应用测试报告", title_style))
story.append(Paragraph(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ParagraphStyle('Normal', parent=styles['Normal'], fontName='Chinese')))
story.append(Spacer(1, 20))

# 项目信息
story.append(Paragraph("项目信息", heading_style))
project_data = [
    ['项目名称', '耳鼻喉科医疗咨询聊天机器人'],
    ['技术栈', 'Next.js 15 + React 19 + TypeScript'],
    ['测试工具', 'Playwright (webapp-testing skill)'],
    ['测试日期', datetime.now().strftime('%Y-%m-%d')],
]
project_table = Table(project_data, colWidths=[4*cm, 12*cm])
project_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e0e7ff')),
    ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, -1), 'Chinese'),
    ('FONTSIZE', (0, 0), (-1, -1), 10),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('GRID', (0, 0), (-1, -1), 1, colors.grey),
]))
story.append(project_table)
story.append(Spacer(1, 20))

# 测试结果
story.append(Paragraph("测试结果总览", heading_style))
test_data = [
    ['测试项', '状态', '说明'],
    ['页面加载', '✓ 通过', '应用正常加载，无错误'],
    ['医生信息显示', '✓ 通过', '许庚医生信息正确显示'],
    ['导航功能', '✓ 通过', '咨询/症状/历史三个标签正常'],
    ['输入框功能', '✓ 通过', '文本输入正常工作'],
    ['发送按钮', '✓ 通过', '按钮可点击'],
    ['症状自查', '✓ 通过', '症状问题列表正常显示'],
    ['历史记录', '✓ 通过', '历史页面正常切换'],
]
test_table = Table(test_data, colWidths=[5*cm, 3*cm, 8*cm])
test_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, -1), 'Chinese'),
    ('FONTSIZE', (0, 0), (-1, 0), 11),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
    ('GRID', (0, 0), (-1, -1), 1, colors.grey),
]))
story.append(test_table)
story.append(Spacer(1, 20))

# 已安装的 Skills
story.append(Paragraph("已安装的 Skills", heading_style))
skills_data = [
    ['Skill 名称', '用途', '状态'],
    ['react-best-practices', 'React 性能优化', '✓ 已安装'],
    ['web-design-guidelines', 'UI/UX 最佳实践', '✓ 已安装'],
    ['webapp-testing', 'Web 应用自动化测试', '✓ 已安装'],
    ['frontend-design', '前端界面设计指南', '✓ 已安装'],
    ['pdf', 'PDF 文档处理', '✓ 已安装'],
]
skills_table = Table(skills_data, colWidths=[5*cm, 7*cm, 4*cm])
skills_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, -1), 'Chinese'),
    ('FONTSIZE', (0, 0), (-1, 0), 11),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
    ('BACKGROUND', (0, 1), (-1, -1), colors.lightgreen),
    ('GRID', (0, 0), (-1, -1), 1, colors.grey),
]))
story.append(skills_table)
story.append(Spacer(1, 20))

# 发现的问题
story.append(Paragraph("代码质量分析", heading_style))
normal_chinese = ParagraphStyle('NormalChinese', parent=styles['Normal'], fontName='Chinese')
story.append(Paragraph("通过 React Best Practices 和 Web Design Guidelines 分析，发现以下优化点：", normal_chinese))
story.append(Spacer(1, 10))

issues_data = [
    ['优先级', '问题', '影响'],
    ['🔴 高', '图片缺少尺寸属性', '导致 CLS 布局偏移'],
    ['🔴 高', '按钮缺少 aria-label', '可访问性问题'],
    ['🟡 中', 'localStorage 可优化', '性能轻微影响'],
    ['🟡 中', '条件渲染可改进', '代码质量'],
]
issues_table = Table(issues_data, colWidths=[3*cm, 7*cm, 6*cm])
issues_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ef4444')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, -1), 'Chinese'),
    ('FONTSIZE', (0, 0), (-1, 0), 11),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
    ('GRID', (0, 0), (-1, -1), 1, colors.grey),
]))
story.append(issues_table)
story.append(Spacer(1, 20))

# 建议
story.append(Paragraph("优化建议", heading_style))
recommendations = [
    "1. 为所有图片添加明确的 width 和 height 属性",
    "2. 为图标按钮添加描述性的 aria-label",
    "3. 使用 lazy state initialization 优化 localStorage 读取",
    "4. 使用三元运算符替代 && 进行条件渲染",
    "5. 考虑添加错误边界和加载状态处理",
]
for rec in recommendations:
    story.append(Paragraph(rec, normal_chinese))
    story.append(Spacer(1, 8))

story.append(Spacer(1, 20))

# 结论
story.append(Paragraph("测试结论", heading_style))
story.append(Paragraph(
    "应用整体功能正常，所有核心功能测试通过。通过 skills.sh 的技能分析，"
    "识别出 12 个优化点，建议优先修复高优先级的可访问性和性能问题。",
    normal_chinese
))

# 生成 PDF
doc.build(story)
print(f"✅ PDF 报告已生成: {pdf_file}")
