import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Input, Space, Typography, message } from 'antd'
import { bilibiliApi } from '../services/api'

const { Title, Text, Paragraph } = Typography

const extractUrl = (text: string): string => {
  if (!text) return ''
  const match = text.match(/https?:\/\/[^\s]+/)
  if (!match) return ''
  return match[0].trim().replace(/[，。；;）)\]>]+$/g, '')
}

const DouyinTestPage: React.FC = () => {
  const [rawInput, setRawInput] = useState('')
  const [projectName, setProjectName] = useState('')
  const [browser, setBrowser] = useState('')
  const [parsing, setParsing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [polling, setPolling] = useState(false)
  const [taskId, setTaskId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [videoInfo, setVideoInfo] = useState<any>(null)
  const [taskInfo, setTaskInfo] = useState<any>(null)

  const normalizedUrl = useMemo(() => extractUrl(rawInput), [rawInput])

  useEffect(() => {
    if (!taskId || !polling) return
    const timer = window.setInterval(async () => {
      try {
        const task = await bilibiliApi.getDouyinTaskStatus(taskId)
        setTaskInfo(task)
        if (task.status === 'completed' || task.status === 'failed') {
          setPolling(false)
          window.clearInterval(timer)
          if (task.status === 'completed') {
            message.success('抖音下载任务完成')
          } else {
            message.error(task.error_message || '抖音下载任务失败')
          }
        }
      } catch (error) {
        setPolling(false)
        window.clearInterval(timer)
        message.error('轮询任务状态失败')
      }
    }, 2000)

    return () => window.clearInterval(timer)
  }, [taskId, polling])

  const parseVideo = async () => {
    if (!normalizedUrl) {
      message.error('未识别到链接，请粘贴抖音分享文案或直链')
      return
    }
    setParsing(true)
    try {
      const result = await bilibiliApi.parseDouyinVideoInfo(normalizedUrl, browser || undefined)
      setVideoInfo(result.video_info)
      if (!projectName && result.video_info?.title) {
        setProjectName(result.video_info.title)
      }
      message.success('抖音视频解析成功')
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '解析失败')
    } finally {
      setParsing(false)
    }
  }

  const createDownload = async () => {
    if (!normalizedUrl) {
      message.error('未识别到链接，请粘贴抖音分享文案或直链')
      return
    }
    setCreating(true)
    try {
      const res = await bilibiliApi.createDouyinDownloadTask({
        url: normalizedUrl,
        project_name: projectName || 'Douyin Test Project',
        video_category: 'default',
        browser: browser || undefined,
      })

      const createdTaskId = (res as any).task_id || (res as any).id
      const createdProjectId = (res as any).project_id || ''
      setTaskId(createdTaskId || '')
      setProjectId(createdProjectId)
      setTaskInfo(res)
      if (createdTaskId) {
        setPolling(true)
      }
      message.success('下载任务已创建')
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '创建下载任务失败')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: '24px auto', padding: '0 16px' }}>
      <Card>
        <Title level={3} style={{ marginTop: 0 }}>抖音下载功能测试页</Title>
        <Paragraph type="secondary">
          用于单独验证抖音解析与下载链路。支持直接粘贴抖音分享文案，系统会自动提取链接。
        </Paragraph>

        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text strong>抖音链接或分享文案</Text>
          <Input.TextArea
            rows={3}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="例如：7.53 复制打开抖音，看看【xxx】 https://v.douyin.com/xxxxx/"
          />

          <Text type="secondary">提取结果：{normalizedUrl || '未识别到链接'}</Text>

          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="项目名（默认用解析结果）"
          />
          <Input
            value={browser}
            onChange={(e) => setBrowser(e.target.value)}
            placeholder="可选：cookiesfrombrowser 浏览器名（如 chrome）"
          />

          <Space>
            <Button onClick={parseVideo} loading={parsing}>1. 解析视频信息</Button>
            <Button type="primary" onClick={createDownload} loading={creating}>2. 创建下载任务</Button>
            <Button onClick={() => setPolling((v) => !v)} disabled={!taskId}>
              {polling ? '停止轮询' : '开始轮询'}
            </Button>
          </Space>
        </Space>

        {videoInfo && (
          <Alert
            style={{ marginTop: 16 }}
            type="success"
            showIcon
            message={`解析成功：${videoInfo.title || '无标题'}`}
            description={`作者：${videoInfo.uploader || '未知'}，时长：${videoInfo.duration || 0}s`}
          />
        )}

        <div style={{ marginTop: 20 }}>
          <Text strong>任务状态</Text>
          <pre style={{ background: '#111', color: '#ddd', padding: 12, borderRadius: 8, overflowX: 'auto' }}>
{JSON.stringify({
  project_id: projectId,
  task_id: taskId,
  polling,
  task_info: taskInfo,
}, null, 2)}
          </pre>
        </div>
      </Card>
    </div>
  )
}

export default DouyinTestPage
