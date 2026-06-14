import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Select,
  Input,
  InputNumber,
  Tag,
  Space,
  message,
  Tabs,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  QrcodeOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { ticketApi, CreateOrderParams } from '../api/ticket';
import { Ticket, Order, TicketType, TicketStatus, OrderStatus, PaginatedResponse } from '../types';
import { useAuthStore } from '../store/auth';
import dayjs from 'dayjs';

const { Option } = Select;

function TicketManagement() {
  const [activeTab, setActiveTab] = useState('orders');
  const [tickets, setTickets] = useState<PaginatedResponse<Ticket> | null>(null);
  const [orders, setOrders] = useState<PaginatedResponse<Order> | null>(null);
  const [loading, setLoading] = useState(false);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [usageRecords, setUsageRecords] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [verifyForm] = Form.useForm();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const { user } = useAuthStore();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await ticketApi.getOrderList({ page, pageSize });
      setOrders(data);
    } catch (error) {
      console.error('获取订单列表失败', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await ticketApi.getMyTickets({ page, pageSize });
      setTickets(data);
    } catch (error) {
      console.error('获取票卡列表失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else {
      fetchTickets();
    }
  }, [activeTab, page]);

  const handleCreateOrder = async (values: CreateOrderParams) => {
    try {
      await ticketApi.createOrder(values);
      message.success('售票成功');
      setOrderModalVisible(false);
      form.resetFields();
      fetchOrders();
    } catch (error: any) {
      message.error(error.response?.data?.message || '售票失败');
    }
  };

  const handleVerifyTicket = async (values: any) => {
    try {
      const result = await ticketApi.verifyTicket(values);
      message.success('核销成功');
      setVerifyModalVisible(false);
      verifyForm.resetFields();
      fetchTickets();
      console.log('核销结果:', result);
    } catch (error: any) {
      message.error(error.response?.data?.message || '核销失败');
    }
  };

  const viewTicketDetail = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    try {
      const records = await ticketApi.getTicketUsageRecords(ticket.id);
      setUsageRecords(records);
    } catch (error) {
      console.error('获取使用记录失败', error);
    }
    setDetailModalVisible(true);
  };

  const getTicketTypeText = (type: TicketType) => {
    const map: Record<TicketType, string> = {
      [TicketType.SINGLE]: '单次票',
      [TicketType.TIMES_CARD]: '次卡',
      [TicketType.MONTHLY_CARD]: '月卡',
    };
    return map[type] || type;
  };

  const getTicketStatusTag = (status: TicketStatus) => {
    const map: Record<TicketStatus, { color: string; text: string }> = {
      [TicketStatus.ACTIVE]: { color: 'green', text: '有效' },
      [TicketStatus.USED_UP]: { color: 'default', text: '已用完' },
      [TicketStatus.EXPIRED]: { color: 'orange', text: '已过期' },
      [TicketStatus.REFUNDING]: { color: 'blue', text: '退款中' },
      [TicketStatus.REFUNDED]: { color: 'red', text: '已退款' },
    };
    const info = map[status] || { color: 'default', text: status };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const getOrderStatusTag = (status: OrderStatus) => {
    const map: Record<OrderStatus, { color: string; text: string }> = {
      [OrderStatus.PENDING]: { color: 'orange', text: '待支付' },
      [OrderStatus.PAID]: { color: 'green', text: '已支付' },
      [OrderStatus.CANCELLED]: { color: 'default', text: '已取消' },
      [OrderStatus.REFUNDED]: { color: 'red', text: '已退款' },
    };
    const info = map[status] || { color: 'default', text: status };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
    },
    {
      title: '票卡类型',
      dataIndex: 'ticketType',
      key: 'ticketType',
      render: (type: TicketType) => getTicketTypeText(type),
    },
    {
      title: '票卡名称',
      dataIndex: 'ticketName',
      key: 'ticketName',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: any) => `¥${Number(val).toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: OrderStatus) => getOrderStatusTag(status),
    },
    {
      title: '支付方式',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  const ticketColumns = [
    {
      title: '票卡名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: TicketType) => getTicketTypeText(type),
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (val: any) => `¥${Number(val).toFixed(2)}`,
    },
    {
      title: '使用次数',
      key: 'times',
      render: (_: any, record: Ticket) => {
        if (record.type === TicketType.SINGLE) {
          return `${record.usedTimes}/1`;
        }
        if (record.type === TicketType.TIMES_CARD) {
          return `${record.usedTimes}/${record.totalTimes}`;
        }
        if (record.type === TicketType.MONTHLY_CARD) {
          return `${record.usedTimes}次 (不限次)`;
        }
        return '-';
      },
    },
    {
      title: '有效期',
      dataIndex: 'expireAt',
      key: 'expireAt',
      render: (val: string) => (val ? dayjs(val).format('YYYY-MM-DD') : '长期'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: TicketStatus) => getTicketStatusTag(status),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Ticket) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => viewTicketDetail(record)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'orders',
      label: '订单管理',
    },
    {
      key: 'tickets',
      label: '票卡管理',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>票务管理</h2>
        <Space>
          {user?.role !== 'customer' && (
            <>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setOrderModalVisible(true)}
              >
                售票
              </Button>
              <Button
                icon={<QrcodeOutlined />}
                onClick={() => setVerifyModalVisible(true)}
              >
                核销
              </Button>
            </>
          )}
        </Space>
      </div>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
        {activeTab === 'orders' ? (
          <Table
            columns={orderColumns}
            dataSource={orders?.list}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total: orders?.total || 0,
              onChange: setPage,
            }}
          />
        ) : (
          <Table
            columns={ticketColumns}
            dataSource={tickets?.list}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total: tickets?.total || 0,
              onChange: setPage,
            }}
          />
        )}
      </Card>

      <Modal
        title="售票"
        open={orderModalVisible}
        onCancel={() => setOrderModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateOrder}>
          <Form.Item
            name="ticketType"
            label="票卡类型"
            rules={[{ required: true, message: '请选择票卡类型' }]}
          >
            <Select placeholder="请选择票卡类型">
              <Option value={TicketType.SINGLE}>单次票</Option>
              <Option value={TicketType.TIMES_CARD}>次卡</Option>
              <Option value={TicketType.MONTHLY_CARD}>月卡</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="ticketName"
            label="票卡名称"
            rules={[{ required: true, message: '请输入票卡名称' }]}
          >
            <Input placeholder="例如：成人单次票、10次卡、月卡" />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.ticketType !== curr.ticketType}>
            {({ getFieldValue }) => {
              const type = getFieldValue('ticketType');
              return (
                <>
                  {type === TicketType.TIMES_CARD && (
                    <Form.Item
                      name="totalTimes"
                      label="总次数"
                      rules={[{ required: true, message: '请输入总次数' }]}
                    >
                      <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入总次数" />
                    </Form.Item>
                  )}
                  {type === TicketType.MONTHLY_CARD && (
                    <Form.Item
                      name="validDays"
                      label="有效天数"
                      rules={[{ required: true, message: '请输入有效天数' }]}
                    >
                      <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入有效天数" />
                    </Form.Item>
                  )}
                </>
              );
            }}
          </Form.Item>

          <Form.Item name="amount" label="金额（元）">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="留空使用默认价格" />
          </Form.Item>

          <Form.Item name="paymentMethod" label="支付方式" initialValue="cash">
            <Select>
              <Option value="cash">现金</Option>
              <Option value="wechat">微信支付</Option>
              <Option value="alipay">支付宝</Option>
              <Option value="card">刷卡</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              确认售票
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="核销票卡"
        open={verifyModalVisible}
        onCancel={() => setVerifyModalVisible(false)}
        footer={null}
        width={400}
      >
        <Form form={verifyForm} layout="vertical" onFinish={handleVerifyTicket}>
          <Form.Item name="pickupCode" label="取件码/票号">
            <Input placeholder="请输入取件码或票号" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              确认核销
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="票卡详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedTicket && (
          <>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="票卡名称">{selectedTicket.name}</Descriptions.Item>
              <Descriptions.Item label="类型">
                {getTicketTypeText(selectedTicket.type)}
              </Descriptions.Item>
              <Descriptions.Item label="价格">¥{Number(selectedTicket.price).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {getTicketStatusTag(selectedTicket.status)}
              </Descriptions.Item>
              <Descriptions.Item label="已使用次数">{selectedTicket.usedTimes}</Descriptions.Item>
              <Descriptions.Item label="总次数">
                {selectedTicket.totalTimes || '不限次'}
              </Descriptions.Item>
              <Descriptions.Item label="有效期" span={2}>
                {selectedTicket.expireAt
                  ? dayjs(selectedTicket.expireAt).format('YYYY-MM-DD')
                  : '长期有效'}
              </Descriptions.Item>
              <Descriptions.Item label="取件码" span={2}>
                <Tag color="blue">{selectedTicket.pickupCode}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <h4 style={{ marginTop: 16 }}>使用记录</h4>
            <Table
              dataSource={usageRecords}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                {
                  title: '使用时间',
                  dataIndex: 'checkInAt',
                  key: 'checkInAt',
                  render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD HH:mm:ss') : '-',
                },
                {
                  title: '使用次数',
                  dataIndex: 'timesUsed',
                  key: 'timesUsed',
                },
              ]}
            />
          </>
        )}
      </Modal>
    </div>
  );
}

export default TicketManagement;
