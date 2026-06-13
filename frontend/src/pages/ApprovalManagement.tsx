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
  Descriptions,
  Badge,
  Tabs,
  Timeline,
} from 'antd';
import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { approvalApi, CreateApprovalParams } from '../api/approval';
import { ticketApi } from '../api/ticket';
import {
  Approval,
  ApprovalType,
  ApprovalStatus,
  PaginatedResponse,
  Ticket,
} from '../types';
import { useAuthStore } from '../store/auth';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

function ApprovalManagement() {
  const [approvals, setApprovals] = useState<PaginatedResponse<Approval> | null>(null);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('all');
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const { user } = useAuthStore();

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (statusFilter !== 'all') params.status = statusFilter;
      const data = await approvalApi.getApprovalList(params);
      setApprovals(data);
    } catch (error) {
      console.error('获取审批列表失败', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTickets = async () => {
    try {
      const data = await ticketApi.getMyTickets({ pageSize: 100 });
      setMyTickets(data.list.filter((t) => t.status === 'active'));
    } catch (error) {
      console.error('获取票卡列表失败', error);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [page, statusFilter]);

  const handleCreateApproval = async (values: CreateApprovalParams) => {
    try {
      await approvalApi.createApproval(values);
      message.success('申请已提交');
      setCreateModalVisible(false);
      form.resetFields();
      fetchApprovals();
    } catch (error: any) {
      message.error(error.response?.data?.message || '提交失败');
    }
  };

  const handleApprove = async (id: string, step: string) => {
    try {
      let result;
      if (step === 'frontDesk') {
        result = await approvalApi.frontDeskApprove(id, '审核通过');
      } else if (step === 'manager') {
        result = await approvalApi.managerApprove(id, '审核通过');
      } else if (step === 'finance') {
        result = await approvalApi.financeApprove(id, '审核通过');
      }
      message.success('审核通过');
      fetchApprovals();
      return result;
    } catch (error: any) {
      message.error(error.response?.data?.message || '审核失败');
    }
  };

  const handleReject = async (id: string) => {
    Modal.confirm({
      title: '拒绝申请',
      content: (
        <Form>
          <Form.Item name="remark" label="拒绝原因" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="请输入拒绝原因" />
          </Form.Item>
        </Form>
      ),
      onOk: async () => {
        try {
          const remark = '拒绝申请';
          await approvalApi.rejectApproval(id, remark);
          message.success('已拒绝');
          fetchApprovals();
        } catch (error: any) {
          message.error(error.response?.data?.message || '操作失败');
        }
      },
    });
  };

  const viewDetail = (approval: Approval) => {
    setSelectedApproval(approval);
    setDetailModalVisible(true);
  };

  const getApprovalTypeText = (type: ApprovalType) => {
    const map: Record<ApprovalType, string> = {
      [ApprovalType.REFUND]: '退卡',
      [ApprovalType.EXCHANGE]: '换票',
    };
    return map[type] || type;
  };

  const getApprovalStatusTag = (status: ApprovalStatus) => {
    const map: Record<ApprovalStatus, { color: string; text: string }> = {
      [ApprovalStatus.PENDING_FRONT_DESK]: { color: 'orange', text: '待前台审核' },
      [ApprovalStatus.PENDING_MANAGER]: { color: 'blue', text: '待主管审核' },
      [ApprovalStatus.PENDING_FINANCE]: { color: 'purple', text: '待财务确认' },
      [ApprovalStatus.APPROVED]: { color: 'green', text: '已通过' },
      [ApprovalStatus.REJECTED]: { color: 'red', text: '已拒绝' },
    };
    const info = map[status] || { color: 'default', text: status };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const canApprove = (approval: Approval) => {
    if (!user) return false;
    const role = user.role;
    const status = approval.status;

    if (status === ApprovalStatus.PENDING_FRONT_DESK && role === 'front_desk') return true;
    if (status === ApprovalStatus.PENDING_MANAGER && role === 'manager') return true;
    if (status === ApprovalStatus.PENDING_FINANCE && role === 'finance') return true;
    if (role === 'admin') return true;
    return false;
  };

  const getCurrentStep = (status: ApprovalStatus) => {
    if (status === ApprovalStatus.PENDING_FRONT_DESK) return 0;
    if (status === ApprovalStatus.PENDING_MANAGER) return 1;
    if (status === ApprovalStatus.PENDING_FINANCE) return 2;
    if (status === ApprovalStatus.APPROVED) return 3;
    if (status === ApprovalStatus.REJECTED) return -1;
    return 0;
  };

  const columns = [
    {
      title: '申请类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: ApprovalType) => getApprovalTypeText(type),
    },
    {
      title: '票卡',
      dataIndex: 'ticket',
      key: 'ticket',
      render: (ticket: Ticket) => ticket?.name || '-',
    },
    {
      title: '退款金额',
      dataIndex: 'refundAmount',
      key: 'refundAmount',
      render: (val: number) => (val ? `¥${val.toFixed(2)}` : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: ApprovalStatus) => getApprovalStatusTag(status),
    },
    {
      title: '申请人',
      dataIndex: 'applicant',
      key: 'applicant',
      render: (applicant: any) => applicant?.name || '-',
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Approval) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => viewDetail(record)}
          >
            详情
          </Button>
          {canApprove(record) && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                style={{ color: '#52c41a' }}
                onClick={() => {
                  const status = record.status;
                  let step = 'frontDesk';
                  if (status === ApprovalStatus.PENDING_MANAGER) step = 'manager';
                  if (status === ApprovalStatus.PENDING_FINANCE) step = 'finance';
                  handleApprove(record.id, step);
                }}
              >
                通过
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => handleReject(record.id)}
              >
                拒绝
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'all',
      label: '全部',
    },
    {
      key: ApprovalStatus.PENDING_FRONT_DESK,
      label: (
        <Badge dot>
          待前台
        </Badge>
      ),
    },
    {
      key: ApprovalStatus.PENDING_MANAGER,
      label: (
        <Badge dot>
          待主管
        </Badge>
      ),
    },
    {
      key: ApprovalStatus.PENDING_FINANCE,
      label: (
        <Badge dot>
          待财务
        </Badge>
      ),
    },
    {
      key: ApprovalStatus.APPROVED,
      label: '已通过',
    },
    {
      key: ApprovalStatus.REJECTED,
      label: '已拒绝',
    },
  ];

  const renderTimeline = (approval: Approval) => {
    const items = [];

    items.push({
      color: 'green',
      children: (
        <div>
          <p style={{ margin: 0 }}>提交申请</p>
          <p style={{ color: '#999', fontSize: 12, margin: 0 }}>
            {approval.applicant?.name || '申请人'} - {dayjs(approval.createdAt).format('YYYY-MM-DD HH:mm')}
          </p>
          {approval.reason && <p style={{ fontSize: 12 }}>原因：{approval.reason}</p>}
        </div>
      ),
    });

    if (approval.frontDeskApproverId) {
      items.push({
        color: approval.status === ApprovalStatus.REJECTED && !approval.managerApproverId ? 'red' : 'green',
        children: (
          <div>
            <p style={{ margin: 0 }}>
              前台审核 {approval.frontDeskRemark?.includes('拒绝') ? '拒绝' : '通过'}
            </p>
            <p style={{ color: '#999', fontSize: 12, margin: 0 }}>
              {approval.frontDeskApprover?.name || '前台'} - {dayjs(approval.frontDeskApprovedAt!).format('YYYY-MM-DD HH:mm')}
            </p>
            {approval.frontDeskRemark && <p style={{ fontSize: 12 }}>备注：{approval.frontDeskRemark}</p>}
          </div>
        ),
      });
    } else if (
      approval.status === ApprovalStatus.PENDING_FRONT_DESK ||
      getCurrentStep(approval.status) > 0
    ) {
      items.push({
        color: 'gray',
        children: <p style={{ margin: 0, color: '#999' }}>待前台审核</p>,
      });
    }

    if (approval.managerApproverId) {
      items.push({
        color: approval.status === ApprovalStatus.REJECTED && !approval.financeApproverId ? 'red' : 'green',
        children: (
          <div>
            <p style={{ margin: 0 }}>
              主管审核 {approval.managerRemark?.includes('拒绝') ? '拒绝' : '通过'}
            </p>
            <p style={{ color: '#999', fontSize: 12, margin: 0 }}>
              {approval.managerApprover?.name || '主管'} - {dayjs(approval.managerApprovedAt!).format('YYYY-MM-DD HH:mm')}
            </p>
            {approval.managerRemark && <p style={{ fontSize: 12 }}>备注：{approval.managerRemark}</p>}
          </div>
        ),
      });
    } else if (getCurrentStep(approval.status) > 1 || approval.status === ApprovalStatus.PENDING_MANAGER) {
      items.push({
        color: 'gray',
        children: <p style={{ margin: 0, color: '#999' }}>待主管审核</p>,
      });
    }

    if (approval.financeApproverId) {
      items.push({
        color: approval.status === ApprovalStatus.REJECTED ? 'red' : 'green',
        children: (
          <div>
            <p style={{ margin: 0 }}>
              财务确认 {approval.financeRemark?.includes('拒绝') ? '拒绝' : '通过'}
            </p>
            <p style={{ color: '#999', fontSize: 12, margin: 0 }}>
              {approval.financeApprover?.name || '财务'} - {dayjs(approval.financeApprovedAt!).format('YYYY-MM-DD HH:mm')}
            </p>
            {approval.financeRemark && <p style={{ fontSize: 12 }}>备注：{approval.financeRemark}</p>}
          </div>
        ),
      });
    } else if (getCurrentStep(approval.status) > 2 || approval.status === ApprovalStatus.PENDING_FINANCE) {
      items.push({
        color: 'gray',
        children: <p style={{ margin: 0, color: '#999' }}>待财务确认</p>,
      });
    }

    if (approval.status === ApprovalStatus.APPROVED) {
      items.push({
        color: 'green',
        children: <p style={{ margin: 0, fontWeight: 'bold' }}>审批完成</p>,
      });
    }

    return <Timeline items={items} />;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>审批管理</h2>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              fetchMyTickets();
              setCreateModalVisible(true);
            }}
          >
            发起申请
          </Button>
        </Space>
      </div>

      <Card>
        <Tabs
          activeKey={statusFilter}
          onChange={(key) => {
            setStatusFilter(key as any);
            setPage(1);
          }}
          items={tabItems}
        />
        <Table
          columns={columns}
          dataSource={approvals?.list}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total: approvals?.total,
            onChange: setPage,
          }}
        />
      </Card>

      <Modal
        title="发起申请"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateApproval}>
          <Form.Item
            name="type"
            label="申请类型"
            rules={[{ required: true, message: '请选择申请类型' }]}
          >
            <Select placeholder="请选择申请类型">
              <Option value={ApprovalType.REFUND}>退卡</Option>
              <Option value={ApprovalType.EXCHANGE}>换票</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="ticketId"
            label="选择票卡"
            rules={[{ required: true, message: '请选择票卡' }]}
          >
            <Select placeholder="请选择要退/换的票卡">
              {myTickets.map((ticket) => (
                <Option key={ticket.id} value={ticket.id}>
                  {ticket.name} - {ticket.type === 'single' ? '单次票' : ticket.type === 'times_card' ? '次卡' : '月卡'}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
            {({ getFieldValue }) =>
              getFieldValue('type') === ApprovalType.REFUND && (
                <Form.Item name="refundAmount" label="退款金额（元）">
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入退款金额" />
                </Form.Item>
              )
            }
          </Form.Item>

          <Form.Item name="reason" label="申请原因">
            <TextArea rows={3} placeholder="请输入申请原因" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              提交申请
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="审批详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedApproval && (
          <>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="申请类型">
                {getApprovalTypeText(selectedApproval.type)}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getApprovalStatusTag(selectedApproval.status)}
              </Descriptions.Item>
              <Descriptions.Item label="票卡" span={2}>
                {selectedApproval.ticket?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="退款金额" span={2}>
                {selectedApproval.refundAmount
                  ? `¥${selectedApproval.refundAmount.toFixed(2)}`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="申请人">
                {selectedApproval.applicant?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="申请时间">
                {dayjs(selectedApproval.createdAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              {selectedApproval.reason && (
                <Descriptions.Item label="申请原因" span={2}>
                  {selectedApproval.reason}
                </Descriptions.Item>
              )}
            </Descriptions>

            <h4>审批流程</h4>
            {renderTimeline(selectedApproval)}
          </>
        )}
      </Modal>
    </div>
  );
}

export default ApprovalManagement;
