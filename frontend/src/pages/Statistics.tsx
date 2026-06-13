import { useState, useEffect } from 'react';
import { Card, DatePicker, Row, Col, Statistic, Tag } from 'antd';
import {
  UserOutlined,
  DollarOutlined,
  LockOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { statisticsApi } from '../api/statistics';
import {
  VisitorFlowItem,
  LockerUsageItem,
  TicketSalesStats,
  LockerWarning,
} from '../types';

function Statistics() {
  const [visitorFlow, setVisitorFlow] = useState<VisitorFlowItem[]>([]);
  const [lockerUsage, setLockerUsage] = useState<LockerUsageItem[]>([]);
  const [ticketSales, setTicketSales] = useState<TicketSalesStats | null>(null);
  const [warning, setWarning] = useState<LockerWarning | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [visitorData, usageData, salesData, warningData] = await Promise.all([
        statisticsApi.getVisitorFlow(),
        statisticsApi.getLockerUsageByHour(),
        statisticsApi.getTicketSalesStats(),
        statisticsApi.getLockerWarning(),
      ]);
      setVisitorFlow(visitorData);
      setLockerUsage(usageData);
      setTicketSales(salesData);
      setWarning(warningData as any);
    } catch (error) {
      console.error('获取统计数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const visitorFlowOption = {
    title: { text: '今日客流曲线', left: 'center' },
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: visitorFlow.map((item) => `${item.hour}:00`),
    },
    yAxis: { type: 'value', name: '人次' },
    series: [
      {
        name: '客流量',
        type: 'line',
        smooth: true,
        data: visitorFlow.map((item) => item.count),
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(24, 144, 255, 0.5)' },
              { offset: 1, color: 'rgba(24, 144, 255, 0.05)' },
            ],
          },
        },
        lineStyle: { color: '#1890ff', width: 3 },
        itemStyle: { color: '#1890ff' },
        markPoint: {
          data: [
            { type: 'max', name: '峰值' },
          ],
        },
      },
    ],
  };

  const lockerUsageOption = {
    title: { text: '各时段柜子使用率', left: 'center' },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>开柜次数: ${data.data.openCount}<br/>使用率: ${data.data.usageRate}%`;
      },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: lockerUsage.map((item) => `${item.hour}:00`),
    },
    yAxis: [
      { type: 'value', name: '开柜次数', position: 'left' },
      { type: 'value', name: '使用率(%)', position: 'right', max: 100 },
    ],
    series: [
      {
        name: '开柜次数',
        type: 'bar',
        data: lockerUsage.map((item) => item.openCount),
        itemStyle: { color: '#1890ff' },
      },
      {
        name: '使用率',
        type: 'line',
        yAxisIndex: 1,
        data: lockerUsage.map((item) => item.usageRate),
        smooth: true,
        lineStyle: { color: '#fa8c16', width: 2 },
        itemStyle: { color: '#fa8c16' },
        markLine: {
          silent: true,
          data: [
            {
              yAxis: 90,
              lineStyle: { color: '#f5222d', type: 'dashed' },
              label: { formatter: '90%预警线' },
            },
          ],
        },
      },
    ],
  };

  const ticketTypeOption = {
    title: { text: '票卡销售类型分布', left: 'center' },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    series: [
      {
        name: '销售数量',
        type: 'pie',
        radius: ['40%', '65%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: true, formatter: '{b}\n{d}%' },
        data: ticketSales?.list.map((item) => ({
          value: item.salesCount,
          name: item.ticketName,
        })) || [],
      },
    ],
  };

  const ticketAmountOption = {
    title: { text: '票卡销售额排行', left: 'center' },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', name: '金额(元)' },
    yAxis: {
      type: 'category',
      data: ticketSales?.list.map((item) => item.ticketName).reverse() || [],
    },
    series: [
      {
        name: '销售额',
        type: 'bar',
        data: ticketSales?.list.map((item) => item.totalAmount).reverse() || [],
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#1890ff' },
              { offset: 1, color: '#722ed1' },
            ],
          },
          borderRadius: [0, 4, 4, 0],
        },
        label: { show: true, position: 'right', formatter: '¥{c}' },
      },
    ],
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>数据统计</h2>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日总客流"
              value={visitorFlow.reduce((sum, item) => sum + item.count, 0)}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日总销量"
              value={ticketSales?.totalSales || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日销售额"
              value={ticketSales?.totalAmount || 0}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="当前柜子使用率"
              value={warning?.usageRate || 0}
              suffix="%"
              prefix={<LockOutlined />}
              valueStyle={{ color: warning?.isWarning ? '#f5222d' : '#722ed1' }}
            />
            {warning?.isWarning && (
              <Tag color="red" style={{ marginTop: 8 }}>
                超过{warning.warningThreshold}%预警
              </Tag>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts option={visitorFlowOption} style={{ height: 350 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts option={lockerUsageOption} style={{ height: 350 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={10}>
          <Card>
            <ReactECharts option={ticketTypeOption} style={{ height: 350 }} />
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card>
            <ReactECharts option={ticketAmountOption} style={{ height: 350 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Statistics;
