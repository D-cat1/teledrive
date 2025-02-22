import { ArrowLeftOutlined, CrownOutlined, FrownOutlined, LogoutOutlined, MobileOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons'
import { Avatar, Button, Card, Checkbox, Col, Form, Input, Layout, List, Modal, notification, Popover, Row, Select, Switch, Typography } from 'antd'
import { useForm } from 'antd/es/form/Form'
import pwaInstallHandler from 'pwa-install-handler'
import React, { useEffect, useState } from 'react'
import { useThemeSwitcher } from 'react-css-theme-switcher'
import { useHistory } from 'react-router-dom'
import useSWRImmutable from 'swr/immutable'
import * as serviceWorkerRegistration from '../serviceWorkerRegistration'
import { apiUrl, fetcher, req } from '../utils/Fetcher'

interface Props {
  me?: any,
  mutate?: any,
  error?: any
}

const Settings: React.FC<Props> = ({ me, mutate, error }) => {
  const history = useHistory()
  const [expandableRows, setExpandableRows] = useState<boolean>()
  const [logoutConfirmation, setLogoutConfirmation] = useState<boolean>(false)
  const [removeConfirmation, setRemoveConfirmation] = useState<boolean>(false)
  const [changeDCConfirmation, setChangeDCConfirmation] = useState<boolean>(false)
  const [loadingChangeServer, setLoadingChangeServer] = useState<boolean>(false)
  const [destroySession, setDestroySession] = useState<boolean>(false)
  const [pwa, setPwa] = useState<{ canInstall: boolean, install: () => Promise<boolean> }>()
  const [dc, setDc] = useState<string>()
  const [formRemoval] = useForm()
  const { data: respVersion } = useSWRImmutable('/utils/version', fetcher)
  const { currentTheme } = useThemeSwitcher()

  const save = async (settings: any): Promise<void> => {
    try {
      await req.patch('/users/me/settings', { settings })
      notification.success({ message: 'Saved' })
      mutate()
    } catch ({ response }) {
      if ((response as any).status === 402) {
        return notification.error({
          message: 'Premium Feature',
          description: 'Please upgrade your plan for using this feature'
        })
      }
      return notification.error({ message: 'Something error. Please try again.' })
    }
  }

  useEffect(() => {
    if (me) {
      setExpandableRows(me.user?.settings?.expandable_rows)
    }
  }, [me])

  useEffect(() => {
    if (error) {
      return history.push('/login')
    }
  }, [error])

  useEffect(() => {
    pwaInstallHandler.addListener(canInstall => {
      setPwa({ canInstall, install: pwaInstallHandler.install })
    })
  }, [])

  useEffect(() => {
    if (window.location.host === 'ge.teledriveapp.com') {
      setDc('ge')
      localStorage.setItem('dc', 'ge')
    } else if (window.location.host === 'us.teledriveapp.com') {
      setDc('us')
      localStorage.setItem('dc', 'us')
    } else {
      setDc('sg')
      localStorage.setItem('dc', 'sg')
    }
  }, [])

  const logout = async () => {
    await req.post('/auth/logout', {}, destroySession ? { params: { destroySession: 1 } } : undefined)
    return window.location.replace('/')
  }

  const remove = async () => {
    const { agreement, reason } = formRemoval.getFieldsValue()
    try {
      await req.post('/users/me/delete', { agreement, reason })
      return window.location.replace('/')
    } catch (error: any) {
      return notification.error({ message: 'Error', description: error.response?.data.error })
    }
  }

  const wantToChangeServer = (server: string) => {
    setDc(server)
    setChangeDCConfirmation(true)
  }

  const changeServer = async () => {
    setLoadingChangeServer(true)
    const { data } = await req.get('/files', { params: {
      full_properties: 1,
      sort: 'created_at',
      offset: 0,
      limit: 10
    } })
    const files = data?.files || []
    while (files?.length < data.length) {
      const { data } = await req.get('/files', { params: {
        full_properties: 1,
        sort: 'created_at',
        offset: 0,
        limit: 10
      } })
      files.push(...data.files)
    }
    (document.querySelector(`#frame${dc}`) as any)?.contentWindow.postMessage({
      type: 'files',
      files
    }, '*')
    // localStorage.setItem('files', JSON.stringify(files || []))
    await req.post('/auth/logout', {}, { params: { destroySession: 1 } })
    setLoadingChangeServer(false)
    setChangeDCConfirmation(false)

    return window.location.replace(`https://${dc === 'sg' ? '' : `${dc}.`}teledriveapp.com/login`)
  }

  return <>
    <Layout.Content>
      <Row style={{ margin: '50px 12px 100px' }}>
        <Col xxl={{ span: 8, offset: 8 }} xl={{ span: 8, offset: 8 }} lg={{ span: 10, offset: 7 }} md={{ span: 14, offset: 5 }} span={24}>
          <Typography.Title>
            Settings
          </Typography.Title>
          <Card loading={!me && !error} title={<Card.Meta avatar={<Avatar size="large" src={`${apiUrl}/users/me/photo`} />} title={<>{me?.user.name} {me?.user?.plan === 'premium' && <Popover placement="top" content={<Layout style={{ padding: '7px 13px' }}>Premium</Layout>}>
            <CrownOutlined />
          </Popover>}</>} description={me?.user.username} />} actions={[<Row style={{ marginTop: '15px' }}>
            <Col span={22} offset={1} md={{ span: 12, offset: 6 }}>
              <Typography.Paragraph style={{ textAlign: 'center' }}>
                <Button block icon={<LogoutOutlined />} danger shape="round"
                  onClick={() => setLogoutConfirmation(true)}>
                  Logout
                </Button>
              </Typography.Paragraph>
              <Typography.Paragraph style={{ textAlign: 'center' }}>
                <Button block icon={<ArrowLeftOutlined />} type="link"
                  onClick={() => history.push('/dashboard')}>
                  Back to Dashboard
                </Button>
              </Typography.Paragraph>
              <Typography.Paragraph style={{ textAlign: 'center' }} type="secondary">
                v{respVersion?.version}
              </Typography.Paragraph>
            </Col>
          </Row>]}>
            <Form layout="horizontal" labelAlign="left" labelCol={{ span: 12 }} wrapperCol={{ span: 12 }}>
              <List>
                <List.Item key="expandable-rows" actions={[<Form.Item name="expandable_rows">
                  <Switch onChange={val => {
                    setExpandableRows(val)
                    save({ expandable_rows: val })
                  }} checked={expandableRows} defaultChecked={expandableRows} />
                </Form.Item>]}>
                  <List.Item.Meta title="Expandable Rows" description="Show file details in row table" />
                </List.Item>

                <List.Item key="dark-mode" actions={[<Form.Item name="dark_mode">
                  <Switch onChange={(val: boolean) => save({ theme: val ? 'dark' : 'light' }).then(window.location.reload)} checked={currentTheme === 'dark'} defaultChecked={currentTheme === 'dark'} />
                </Form.Item>]}>
                  <List.Item.Meta title="Dark Mode" description="Join the dark side" />
                </List.Item>

                <List.Item key="change-server" actions={[<Form.Item name="change_server">
                  {dc && <Select defaultValue={dc} value={dc} onChange={wantToChangeServer}>
                    <Select.Option value="sg">&#127480;&#127468; Singapore</Select.Option>
                    <Select.Option value="ge">&#127465;&#127466; Frankfurt</Select.Option>
                    <Select.Option value="us">&#127482;&#127480; New York</Select.Option>
                  </Select>}
                </Form.Item>]}>
                  <List.Item.Meta title="Change Server" description="Migrate to another datacenter" />
                </List.Item>

                <List.Item key="check-for-updates" actions={[<Form.Item>
                  <Button shape="round" icon={<ReloadOutlined />} onClick={() => {
                    serviceWorkerRegistration.unregister();
                    (window.location as any).reload(true)
                  }}>Reload</Button>
                </Form.Item>]}>
                  <List.Item.Meta title="Check Updates" description="Reload to checking for updates" />
                </List.Item>

                {pwa?.canInstall && <List.Item key="install" actions={[<Form.Item>
                  <Button shape="round" icon={<MobileOutlined />} onClick={pwa?.install}>Install</Button>
                </Form.Item>]}>
                  <List.Item.Meta title="Install App" description="Install TeleDrive to your device" />
                </List.Item>}

                <List.Item key="delete-account" actions={[<Form.Item>
                  <Button shape="round" danger type="primary" icon={<FrownOutlined />} onClick={() => setRemoveConfirmation(true)}>Delete</Button>
                </Form.Item>]}>
                  <List.Item.Meta title={<Typography.Text type="danger">Delete Account</Typography.Text>} description="Delete your account permanently" />
                </List.Item>
              </List>

            </Form>
          </Card>
        </Col>
      </Row>
    </Layout.Content>

    <Modal title={<Typography.Text>
      <Typography.Text type="warning"><WarningOutlined /></Typography.Text> Confirmation
    </Typography.Text>}
    visible={logoutConfirmation}
    onCancel={() => setLogoutConfirmation(false)}
    onOk={logout}
    cancelButtonProps={{ shape: 'round' }}
    okButtonProps={{ danger: true, type: 'primary', shape: 'round' }}>
      <Typography.Paragraph>
        Are you sure to logout?
      </Typography.Paragraph>
      <Form.Item help="All files you share will not be able to download once you sign out">
        <Checkbox checked={destroySession} onChange={({ target }) => setDestroySession(target.checked)}>
          Also delete my active session
        </Checkbox>
      </Form.Item>
    </Modal>

    <Modal title={<Typography.Text>
      <Typography.Text type="warning"><WarningOutlined /></Typography.Text> This action cannot be undone
    </Typography.Text>}
    visible={removeConfirmation}
    onCancel={() => setRemoveConfirmation(false)}
    onOk={remove}
    cancelButtonProps={{ shape: 'round' }}
    okButtonProps={{ danger: true, type: 'primary', shape: 'round' }}>
      <Form form={formRemoval} onFinish={remove} layout="vertical">
        <Form.Item name="reason" label="Reason" rules={[{ required: true, message: 'Please input your reason' }]}>
          <Input.TextArea />
        </Form.Item>
        <Form.Item name="agreement" label={<Typography.Text>Please type <Typography.Text type="danger">permanently removed</Typography.Text> for your confirmation</Typography.Text>} rules={[{ required: true, message: 'Please input the confirmation' }]}>
          <Input />
        </Form.Item>
      </Form>
    </Modal>

    <Modal title={<Typography.Text>
      <Typography.Text type="warning"><WarningOutlined /></Typography.Text> Confirmation
    </Typography.Text>}
    visible={changeDCConfirmation}
    onCancel={() => setChangeDCConfirmation(false)}
    onOk={changeServer}
    cancelButtonProps={{ shape: 'round' }}
    okButtonProps={{ danger: true, type: 'primary', shape: 'round', loading: loadingChangeServer }}>
      <Typography.Paragraph>
        Are you sure to change the server region?
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary">
        You'll be logged out and redirected to the new server. Please login again to that new server.
      </Typography.Paragraph>
    </Modal>

    <iframe style={{ display: 'none' }} src="https://teledriveapp.com" id="framesg" />
    <iframe style={{ display: 'none' }} src="https://us.teledriveapp.com" id="frameus" />
    <iframe style={{ display: 'none' }} src="https://ge.teledriveapp.com" id="framege" />
  </>
}

export default Settings