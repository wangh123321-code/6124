import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  Tabs,
  Table,
  message,
  Tooltip,
  Popconfirm,
} from 'antd';
import {
  UnlockOutlined,
  LockOutlined,
  ToolOutlined,
  WarningOutlined,
  HistoryOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { lockerApi, OpenMethod, OpenLockerParams } from '../api/locker';
import { Locker, LockerStatus, LockerZone, LockerStatistics, ZoneStatistics, LockerLog } from '../types';
import { useAuthStore } from '../store/auth';
import dayjs from 'dayjs';

const { Option } = Select;

function LockerManagement() {
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [statistics, setStatistics] = useState<LockerStatistics | null>(null);
  const [zoneStats, setZoneStats] = useState<ZoneStatistics[]>([]);
  const [selectedZone, setSelectedZone] = useState<LockerZone | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<LockerStatus | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [openModalVisible, setOpenModalVisible] = useState(false);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null);
  const [lockerLogs, setLockerLogs] = useState<LockerLog[]>([]);
  const [form] = Form.useForm();
  const { user } = useAuthStore();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stats, zoneData] = await Promise.all([
        lockerApi.getLockerStatistics(),
        lockerApi.getZoneStatistics(),
      ]);
      setStatistics(stats);
      setZoneStats(zoneData);
      fetchLockers();
    } catch (error) {
      console.error('获取数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLockers = async () => {
    try {
      const params: any = {};
      if (selectedZone !== 'all') params.zone = selectedZone;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      const data = await lockerApi.getLockers(params);
      setLockers(data);
    } catch (error) {
      console.error('获取柜子列表失败', error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchLockers();
  }, [selectedZone, selectedStatus]);

  const handleOpenLocker = async (values: any) => {
    try {
      await lockerApi.openLocker(values as OpenLockerParams);
      message.success('开柜成功');
      setOpenModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '开柜失败');
    }
  };

  const handleCloseLocker = async (lockerNo: string) => {
    try {
      await lockerApi.closeLocker({ lockerNo });
      message.success('关柜成功');
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '关柜失败');
    }
  };

  const handleSetFaulty = async (lockerNo: string) => {
    try {
      await lockerApi.setFaulty({ lockerNo, remark: '管理员标记故障' });
      message.success('已标记故障');
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleRepairLocker = async (lockerNo: string) => {
    try {
      await lockerApi.repairLocker({ lockerNo, remark: '修复完成' });
      message.success('已修复');
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleForceClear = async (lockerNo: string) => {
    try {
      await lockerApi.forceClear({ lockerNo, reason: '管理员强制清柜' });
      message.success('强制清柜成功');
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const viewLockerLogs = async (lockerNo: string) => {
    try {
      const logs = await lockerApi.getLockerLogs(lockerNo);
      setLockerLogs(logs);
      setLogModalVisible(true);
    } catch (error) {
      console.error('获取日志失败', error);
    }
  };

  const getStatusColor = (status: LockerStatus) => {
    const map: Record<LockerStatus, string> = {
      [LockerStatus.FREE]: 'green',
      [LockerStatus.IN_USE]: 'orange',
      [LockerStatus.RESERVED]: 'blue',
      [LockerStatus.FAULTY]: 'red',
    };
    return map[status] || 'default';
  };

  const getStatusText = (status: LockerStatus) => {
    const map: Record<LockerStatus, string> = {
      [LockerStatus.FREE]: '空闲',
      [LockerStatus.IN_USE]: '使用中',
      [LockerStatus.RESERVED]: '预留',
      [LockerStatus.FAULTY]: '故障',
    };
    return map[status] || status;
  };

  const isOverdue = (locker: Locker) => {
    if (locker.status !== LockerStatus.IN_USE || !locker.usedAt) return false;
    const hoursUsed = (Date.now() - new Date(locker.usedAt).getTime()) / (1000 * 60 * 60);
    return hoursUsed > 4;
  };

  const renderLockerGrid = () => {
    const zones = selectedZone === 'all'
      ? [LockerZone.A, LockerZone.B, LockerZone.C, LockerZone.D]
      : [selectedZone];

    return zones.map((zone) => {
      const zoneLockers = lockers.filter((l) => l.zone === zone);
      return (
        <Card
          key={zone}
          title={`${zone}区 (${zoneLockers.length}个)`}
          style={{ marginBottom: 16 }}
          size="small"
        >
          <Row gutter={[8, 8]}>
            {zoneLockers.map((locker) => (
              <Col key={locker.id} xs={6} sm={4} md={3} lg={2}>
                <Tooltip
                  title={
                    <div>
                      <p>柜号：{locker.lockerNo}</p>
                      <p>状态：{getStatusText(locker.status)}</p>
                      {locker.usedAt && (
                        <p>使用时间：{dayjs(locker.usedAt).format('MM-DD HH:mm')}</p>
                      )}
                      {isOverdue(locker) && <p style={{ color: 'red' }}>已超时！</p>}
                    </div>
                  }
                >
                  <div
                    style={{
                      padding: '12px 8px',
                      textAlign: 'center',
                      borderRadius: '6px',
                      border: `2px solid var(--ant-${getStatusColor(locker.status)}-color)`,
                      background: locker.status === LockerStatus.FREE ? '#f6ffed' :
                        locker.status === LockerStatus.IN_USE ? '#fff7e6' :
                        locker.status === LockerStatus.RESERVED ? '#e6f7ff' : '#fff1f0',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                    onClick={() => {
                      setSelectedLocker(locker);
                      setOpenModalVisible(true);
                      form.setFieldsValue({ lockerNo: locker.lockerNo });
                    }}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: 14 }}>{locker.lockerNo}</div>
                    <Tag
                      color={getStatusColor(locker.status)}
                      style={{ marginTop: 4, fontSize: 11 }}
                    >
                      {getStatusText(locker.status)}
                    </Tag>
                    {isOverdue(locker) && (
                      <WarningOutlined
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          color: '#f5222d',
                          fontSize: 12,
                        }}
                      />
                    )}
                  </div>
                </Tooltip>
              </Col>
            ))}
          </Row>
        </Card>
      );
    });
  };

  const logColumns = [
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => {
        const actionMap: Record<string, string> = {
          open: '开柜',
          close: '关柜',
          reserve: '预留',
          cancel_reserve: '取消预留',
          force_clear: '强制清柜',
          set_faulty: '标记故障',
          repair: '修复',
        };
        return actionMap[action] || action;
      },
    },
    {
      title: '操作方式',
      dataIndex: 'openMethod',
      key: 'openMethod',
      render: (method: string) => {
        if (!method) return '-';
        return method === 'bluetooth' ? '蓝牙' : '取件码';
      },
    },
    {
      title: '操作人ID',
      dataIndex: 'operatorId',
      key: 'operatorId',
      render: (id: string) => id || '系统',
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>储物柜管理</h2>
        <Space>
          <Button type="primary" icon={<UnlockOutlined />} onClick={() => setOpenModalVisible(true)}>
            开柜
          </Button>
          {isAdmin && (
            <Button
              icon={<ExclamationCircleOutlined />}
              onClick={() => lockerApi.checkOverdue().then((count) => {
                message.success(`已检查，有${count}个超时柜子`);
                fetchData();
              })}
            >
              检查超时
            </Button>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic title="总柜子数" value={statistics?.total || 0} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic title="空闲" value={statistics?.free || 0} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic title="使用中" value={statistics?.inUse || 0} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic title="预留" value={statistics?.reserved || 0} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic title="故障" value={statistics?.faulty || 0} valueStyle={{ color: '#f5222d' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic title="超时" value={statistics?.overdue || 0} valueStyle={{ color: '#eb2f96' }} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <span>区域：</span>
          <Select
            value={selectedZone}
            onChange={(val) => setSelectedZone(val)}
            style={{ width: 120 }}
          >
            <Option value="all">全部</Option>
            <Option value={LockerZone.A}>A区</Option>
            <Option value={LockerZone.B}>B区</Option>
            <Option value={LockerZone.C}>C区</Option>
            <Option value={LockerZone.D}>D区</Option>
          </Select>
          <span>状态：</span>
          <Select
            value={selectedStatus}
            onChange={(val) => setSelectedStatus(val)}
            style={{ width: 120 }}
          >
            <Option value="all">全部</Option>
            <Option value={LockerStatus.FREE}>空闲</Option>
            <Option value={LockerStatus.IN_USE}>使用中</Option>
            <Option value={LockerStatus.RESERVED}>预留</Option>
            <Option value={LockerStatus.FAULTY}>故障</Option>
          </Select>
          <Button icon={<HistoryOutlined />} onClick={fetchData}>
            刷新
          </Button>
        </Space>

        {renderLockerGrid()}
      </Card>

      <Modal
        title={selectedLocker ? `操作柜子 ${selectedLocker.lockerNo}` : '开柜'}
        open={openModalVisible}
        onCancel={() => setOpenModalVisible(false)}
        footer={null}
        width={400}
      >
        {selectedLocker && (
          <div style={{ marginBottom: 16 }}>
            <Space wrap>
              <Tag color={getStatusColor(selectedLocker.status)}>
                {getStatusText(selectedLocker.status)}
              </Tag>
              {selectedLocker.pickupCode && (
                <Tag color="blue">取件码：{selectedLocker.pickupCode}</Tag>
              )}
            </Space>
          </div>
        )}

        {selectedLocker?.status === LockerStatus.FREE && (
          <Form form={form} layout="vertical" onFinish={handleOpenLocker}>
            <Form.Item name="lockerNo" label="柜号" rules={[{ required: true }]}>
              <Input placeholder="请输入柜号" />
            </Form.Item>
            <Form.Item name="openMethod" label="开柜方式" initialValue={OpenMethod.PICKUP_CODE}>
              <Select>
                <Option value={OpenMethod.PICKUP_CODE}>取件码</Option>
                <Option value={OpenMethod.BLUETOOTH}>蓝牙</Option>
              </Select>
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.openMethod !== curr.openMethod}>
              {({ getFieldValue }) =>
                getFieldValue('openMethod') === OpenMethod.PICKUP_CODE && (
                  <Form.Item name="pickupCode" label="取件码">
                    <Input placeholder="请输入取件码（留空自动生成）" />
                  </Form.Item>
                )
              }
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                开柜
              </Button>
            </Form.Item>
          </Form>
        )}

        {selectedLocker?.status === LockerStatus.IN_USE && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button block icon={<LockOutlined />} onClick={() => {
              handleCloseLocker(selectedLocker.lockerNo);
              setOpenModalVisible(false);
            }}>
              关柜
            </Button>
            {isAdmin && (
              <Popconfirm
                title="确认强制清柜？"
                description="使用超过24小时才可以强制清柜"
                onConfirm={() => {
                  handleForceClear(selectedLocker.lockerNo);
                  setOpenModalVisible(false);
                }}
              >
                <Button block danger icon={<ExclamationCircleOutlined />}>
                  强制清柜
                </Button>
              </Popconfirm>
            )}
            <Button
              block
              icon={<HistoryOutlined />}
              onClick={() => {
                viewLockerLogs(selectedLocker.lockerNo);
                setOpenModalVisible(false);
              }}
            >
              查看操作记录
            </Button>
          </Space>
        )}

        {selectedLocker?.status === LockerStatus.FAULTY && isAdmin && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              block
              type="primary"
              icon={<ToolOutlined />}
              onClick={() => {
                handleRepairLocker(selectedLocker.lockerNo);
                setOpenModalVisible(false);
              }}
            >
              标记为已修复
            </Button>
            <Button
              block
              icon={<HistoryOutlined />}
              onClick={() => {
                viewLockerLogs(selectedLocker.lockerNo);
                setOpenModalVisible(false);
              }}
            >
              查看操作记录
            </Button>
          </Space>
        )}

        {selectedLocker?.status !== LockerStatus.FAULTY && isAdmin &&
          selectedLocker?.status !== LockerStatus.IN_USE && (
          <Popconfirm
            title="确认标记故障？"
            onConfirm={() => {
              handleSetFaulty(selectedLocker!.lockerNo);
              setOpenModalVisible(false);
            }}
          >
            <Button block danger icon={<WarningOutlined />}>
              标记故障
            </Button>
          </Popconfirm>
        )}
      </Modal>

      <Modal
        title="操作记录"
        open={logModalVisible}
        onCancel={() => setLogModalVisible(false)}
        footer={null}
        width={700}
      >
        <Table
          dataSource={lockerLogs}
          columns={logColumns}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Modal>
    </div>
  );
}

export default LockerManagement;
