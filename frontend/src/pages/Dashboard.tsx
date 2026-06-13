import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Space } from 'antd';
import {
  UserOutlined,
  DollarOutlined,
  LockOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { statisticsApi } from '../api/statistics';
import { lockerApi } from '../api/locker';
import { TodayOverview, VisitorFlowItem, LockerUsageItem, TicketSalesStats, ZoneStatistics, LockerWarning } from '../types';
import { LockerZone } from '../types';

function Dashboard() {
  const [overview, setOverview] = useState<TodayOverview | null>(null);
  const [visitorFlow, setVisitorFlow] = useState<VisitorFlowItem[]>([]);
  const [lockerUsage, setLockerUsage] = useState<LockerUsageItem[]>([]);
  const [ticketSales, setTicketSales] = useState<TicketSalesStats | null>(null);
  const [zoneStats, setZoneStats] = useState<ZoneStatistics[]>([]);
  const [warning, setWarning] = useState<LockerWarning | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewData, visitorData, usageData, salesData, zoneData, warningData] = await Promise.all([
        statisticsApi.getTodayOverview(),
        statisticsApi.getVisitorFlow(),
        statisticsApi.getLockerUsageByHour(),
        statisticsApi.getTicketSalesStats(),
        lockerApi.getZoneStatistics(),
        statisticsApi.getLockerWarning(),
      ]);
      setOverview(overviewData);
      setVisitorFlow(visitorData);
      setLockerUsage(usageData);
      setTicketSales(salesData);
      setZoneStats(zoneData);
      setWarning(warningData as any);
    } catch (error) {
      console.error('获取数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const visitorFlowOption = {
    title: { text: '今日客流曲线', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: visitorFlow.map((item) => `${item.hour}:00`),
    },
    yAxis: { type: 'value', name: '人数' },
    series: [
      {
        name: '客流',
        type: 'line',
        smooth: true,
        data: visitorFlow.map((item) => item.count),
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(24, 144, 255, 0.5)' },
              { offset: 1, color: 'rgba(24, 144, 255, 0.1)' },
            ],
          },
        },
        lineStyle: { color: '#1890ff', width: 2 },
        itemStyle: { color: '#1890ff' },
      },
    ],
  };

  const ticketSalesOption = {
    title: { text: '今日票卡销售占比', left: 'center' },
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        name: '销售占比',
        type: 'pie',
        radius: ['40%', '70%'],
        data: ticketSales?.list.map((item) => ({
          value: item.salesCount,
          name: item.ticketName,
        })) || [],
      },
    ],
  };

  const zoneColumns = [
    {
      title: '区域',
      dataIndex: 'zone',
      key: 'zone',
      render: (zone: LockerZone) => <Tag color="blue">{zone}区</Tag>,
    },
    {
      title: '总数',
      dataIndex: 'total',
      key: 'total',
    },
    {
      title: '空闲',
      dataIndex: 'free',
      key: 'free',
      render: (val: number) => <Tag color="green">{val}</Tag>,
    },
    {
      title: '使用中',
      dataIndex: 'inUse',
      key: 'inUse',
      render: (val: number) => <Tag color="orange">{val}</Tag>,
    },
    {
      title: '预留',
      dataIndex: 'reserved',
      key: 'reserved',
      render: (val: number) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: '故障',
      dataIndex: 'faulty',
      key: 'faulty',
      render: (val: number) => <Tag color="red">{val}</Tag>,
    },
    {
      title: '使用率',
      key: 'usageRate',
      render: (_: any, record: ZoneStatistics) => {
        const rate = record.total > 0 ? ((record.inUse / record.total) * 100).toFixed(1) : 0;
        const isHigh = Number(rate) > 90;
        return (
          <Tag color={isHigh ? 'red' : 'default'}>
            {rate}%
            {isHigh && <WarningOutlined style={{ marginLeft: 4 }} />}
          </Tag>
        );
      },
    },
  ];

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>数据概览</h2>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日客流"
              value={overview?.visitor.todayCount || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日订单"
              value={overview?.sales.todayOrders || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日销售额"
              value={overview?.sales.todayAmount || 0}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="柜子使用率"
              value={overview?.locker.usageRate || 0}
              suffix="%"
              prefix={<LockOutlined />}
              valueStyle={{ color: overview?.locker.isWarning ? '#f5222d' : '#722ed1' }}
            />
            {overview?.locker.isWarning && (
              <Tag color="red" icon={<WarningOutlined />}>
                超过90%预警
              </Tag>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="今日客流曲线">
            <ReactECharts option={visitorFlowOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="票卡销售占比">
            <ReactECharts option={ticketSalesOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="各区域柜子状态">
            <Table
              columns={zoneColumns}
              dataSource={zoneStats}
              rowKey="zone"
              pagination={false}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;
