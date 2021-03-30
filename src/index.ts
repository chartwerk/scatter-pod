import { ChartwerkPod, VueChartwerkPodMixin, TickOrientation, TimeFormat } from '@chartwerk/core';
import { ScatterData, ScatterOptions, PointType, LineType } from './types';

import * as d3 from 'd3';
import * as _ from 'lodash';

// TODO: use pod state with defaults
const DEFAULT_POINT_SIZE = 4;
const POINT_HIGHLIGHT_DIAMETER = 4;
const CROSSHAIR_BACKGROUND_RAIDUS = 9;
const CROSSHAIR_BACKGROUND_OPACITY = 0.3;
const DEFAULT_POINT_TYPE = PointType.CIRCLE;
const DEFAULT_LINE_TYPE = LineType.NONE;

export class ChartwerkScatterPod extends ChartwerkPod<ScatterData, ScatterOptions> {
  _metricsContainer: any;
  _voronoiDiagram: any;
  _voronoiRadius: number;

  constructor(el: HTMLElement, _series: ScatterData[] = [], _options: ScatterOptions = {}) {
    super(d3, el, _series, _options);
  }

  renderMetrics(): void {
    if(this.series.length === 0) {
      this.renderNoDataPointsMessage();
      return;
    }
    this.updateCrosshair();

    // container for clip path
    const clipContatiner = this.chartContainer
      .append('g')
      .attr('clip-path', `url(#${this.rectClipId})`)
      .attr('class', 'metrics-container');
    // container for panning
    this._metricsContainer = clipContatiner
      .append('g')
      .attr('class', ' metrics-rect')

    for(let idx = 0; idx < this.series.length; ++idx) {
      if(this.series[idx].visible === false) {
        continue;
      }
      const target = this.series[idx].target;
      const pointType = this.series[idx].pointType || DEFAULT_POINT_TYPE;
      const lineType = this.series[idx].lineType || DEFAULT_LINE_TYPE;
      const pointSize = this.series[idx].pointSize || DEFAULT_POINT_SIZE;
      this.renderMetric(
        this.series[idx].datapoints,
        { color: this.getSerieColor(idx), target, pointType, lineType, pointSize }
      );
    }
    this.voronoiDiagramInit();
  }

  protected updateCrosshair(): void {
    this.appendCrosshairCircles();
  }

  appendCrosshairCircles(): void {
    this.series.forEach((serie: ScatterData, serieIdx: number) => {
      this.appendCrosshairCircle(serieIdx);
    });
  }

  protected appendCrosshairCircle(serieIdx: number): void {
    const pointType = this.series[serieIdx].pointType || DEFAULT_POINT_TYPE;
    switch(pointType) {
      case PointType.NONE:
        return;
      case PointType.CIRCLE:
        this.crosshair.append('circle')
          .attr('class', `crosshair-circle crosshair-circle-${serieIdx} crosshair-background`)
          .attr('r', this.getCrosshairCirceBackgroundSize(serieIdx))
          .attr('clip-path', `url(#${this.rectClipId})`)
          .attr('fill', this.getSerieColor(serieIdx))
          .style('opacity', CROSSHAIR_BACKGROUND_OPACITY)
          .style('pointer-events', 'none')
          .style('display', 'none');

        this.crosshair
          .append('circle')
          .attr('class', `crosshair-circle crosshair-circle-${serieIdx}`)
          .attr('clip-path', `url(#${this.rectClipId})`)
          .attr('fill', this.getSerieColor(serieIdx))
          .attr('r', this.series[serieIdx].pointSize || DEFAULT_POINT_SIZE)
          .style('pointer-events', 'none')
          .style('display', 'none');
        return;
      case PointType.RECTANGLE:
        this.crosshair.append('rect')
          .attr('class', `crosshair-circle crosshair-circle-${serieIdx} crosshair-background`)
          .attr('width', this.getCrosshairCirceBackgroundSize(serieIdx))
          .attr('height', this.getCrosshairCirceBackgroundSize(serieIdx))
          .attr('clip-path', `url(#${this.rectClipId})`)
          .attr('fill', this.getSerieColor(serieIdx))
          .style('opacity', CROSSHAIR_BACKGROUND_OPACITY)
          .style('pointer-events', 'none')
          .style('display', 'none');

        this.crosshair
          .append('rect')
          .attr('class', `crosshair-circle crosshair-circle-${serieIdx}`)
          .attr('clip-path', `url(#${this.rectClipId})`)
          .attr('fill', this.getSerieColor(serieIdx))
          .attr('width', this.series[serieIdx].pointSize || DEFAULT_POINT_SIZE)
          .attr('height', this.series[serieIdx].pointSize || DEFAULT_POINT_SIZE)
          .style('pointer-events', 'none')
          .style('display', 'none');
          return;
      default:
        throw new Error(`Unknown render point type: ${pointType}`);
    }
  }

  protected renderMetric(
    datapoints: number[][],
    metricOptions: {
      color: string,
      target: string,
      pointType: PointType,
      lineType: LineType,
      pointSize: number
    }
  ): void {
    this.renderPoints(datapoints, metricOptions.pointType, metricOptions.pointSize, metricOptions.color);
    this.renderLine(datapoints, metricOptions.lineType, metricOptions.color);
  }

  renderLine(datapoints: number[][], lineType: LineType, color: string): void {
    if(lineType === LineType.NONE) {
      return;
    }
    let strokeDasharray;
    if(lineType === LineType.DASHED) {
      strokeDasharray = 4;
    }
    const lineGenerator = this.d3.line()
      .x((d: [number, number]) => this.xScale(d[1]))
      .y((d: [number, number]) => this.yScale(d[0]));

    this._metricsContainer
      .append('path')
      .datum(datapoints)
      .attr('class', 'metric-path')
      .attr('fill', 'none')
      .style('pointer-events', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.7)
      .attr('stroke-dasharray', strokeDasharray)
      .attr('d', lineGenerator);
  }

  protected renderPoints(datapoints: number[][], pointType: PointType, pointSize: number, color: string): void {
    switch(pointType) {
      case PointType.NONE:
        return;
      case PointType.CIRCLE:
        this._metricsContainer.selectAll(null)
          .data(datapoints)
          .enter()
          .append('circle')
          .attr('class', `metric-element metric-circle`)
          .attr('r', pointSize)
          .style('fill', color)
          .style('pointer-events', 'none')
          .attr('cx', (d: [number, number]) => this.xScale(d[1]))
          .attr('cy', (d: [number, number]) => this.yScale(d[0]));
        return;
      case PointType.RECTANGLE:
        this._metricsContainer.selectAll(null)
          .data(datapoints)
          .enter()
          .append('rect')
          .attr('class', `metric-element metric-circle`)
          .style('fill', color)
          .style('pointer-events', 'none')
          .attr('x', (d: [number, number]) => this.xScale(d[1]) - pointSize / 2)
          .attr('y', (d: [number, number]) => this.yScale(d[0]) - pointSize / 2)
          .attr('width', pointSize)
          .attr('height', pointSize);
          return;
      default:
        throw new Error(`Unknown render point type: ${pointType}`);
    }
  }

  protected voronoiDiagramInit(): void {
    const allDatapoints = this.getAllDatapoints();
    this._voronoiDiagram = d3.voronoi()
      .x(d => this.xScale(d[1]))
      .y(d => this.yScale(d[0]))
      // @ts-ignore
      .size([this.width, this.height])(allDatapoints);
    // TODO: move const to option;
    this._voronoiRadius = this.width / 10;
  }

  onPanningEnd(): void {
    this.isPanning = false;
    this.onMouseOut();
    this.voronoiDiagramInit();
    if(this.options.eventsCallbacks !== undefined && this.options.eventsCallbacks.panningEnd !== undefined) {
      this.options.eventsCallbacks.panningEnd([this.state.xValueRange, this.state.yValueRange]);
    } else {
      console.log('on panning end, but there is no callback');
    }
  }

  unhighlight(): void {
    this.crosshair.selectAll('.crosshair-circle').style('display', 'none');
  }

  highlight(d: [number, number, number]) {
    this.unhighlight();
    if(d !== undefined && d !== null) {
      const size = this.getCrosshairCirceBackgroundSize(d[2]);
      this.crosshair.selectAll(`.crosshair-circle-${d[2]}`)
        .attr('cx', this.xScale(d[1]))
        .attr('cy', this.yScale(d[0]))
        .attr('x', this.xScale(d[1]) - size / 2)
        .attr('y', this.yScale(d[0]) - size / 2)
        .style('display', null);
    }
  }

  protected getCrosshairCirceBackgroundSize(serieIdx: number): number {
    const seriePointSize = this.series[serieIdx].pointSize;
    if(seriePointSize === undefined) {
      return DEFAULT_POINT_SIZE + POINT_HIGHLIGHT_DIAMETER;
    }
    return seriePointSize + POINT_HIGHLIGHT_DIAMETER;
  }

  public renderSharedCrosshair(timestamp: number): void {
    this.crosshair.style('display', null);
    this.crosshair.selectAll('.crosshair-circle')
      .style('display', 'none');

    const x = this.xScale(timestamp);
    this.crosshair.select('#crosshair-line-x')
      .attr('y1', 0).attr('x1', x)
      .attr('y2', this.height).attr('x2', x);
  }

  public hideSharedCrosshair(): void {
    this.crosshair.style('display', 'none');
  }

  onMouseMove(): void {
    const mousePosition = this.d3.mouse(this.chartContainer.node());
    const eventX = mousePosition[0];
    const eventY = mousePosition[1];
    if(this.isOutOfChart() === true || this.isPanning === true || this.isBrushing === true) {
      this.crosshair.style('display', 'none');
      return;
    } else {
      this.crosshair.style('display', null);
    }
    this.crosshair.select('#crosshair-line-x')
      .attr('x1', eventX)
      .attr('x2', eventX);
    this.crosshair.select('#crosshair-line-y')
      .attr('y1', eventY)
      .attr('y2', eventY);

    const foundItems = this._voronoiDiagram.find(eventX, eventY, this._voronoiRadius);
    let highlighted = null;
    if(foundItems === null || foundItems.data === undefined) {
      this.unhighlight();
    } else {
      this.highlight(foundItems.data);
      highlighted = {
        pointIdx: foundItems.index,
        values: foundItems.data
      }
    }
    if(this.options.eventsCallbacks === undefined || this.options.eventsCallbacks.mouseMove === undefined) {
      console.log('Mouse move, but there is no callback');
      return;
    }
    // TODO: group fields
    this.options.eventsCallbacks.mouseMove({
      x: this.d3.event.clientX,
      y: this.d3.event.clientY,
      xval: this.xScale.invert(eventX),
      yval: this.xScale.invert(eventY),
      highlighted,
      chartX: eventX,
      chartWidth: this.width
    });
  }

  onMouseOver(): void {
    if(this.isOutOfChart() === true || this.isPanning === true || this.isBrushing === true) {
      this.crosshair.style('display', 'none');
      return;
    }
    this.crosshair.style('display', null);
  }

  onMouseOut(): void {
    if(this.options.eventsCallbacks !== undefined && this.options.eventsCallbacks.mouseOut !== undefined) {
      this.options.eventsCallbacks.mouseOut();
    }
    this.crosshair.style('display', 'none');
  }

  getAllDatapoints(): number[][] {
    const datapointsList = _.map(this.series, (serie, idx) => {
      const datapointsWithSerieIdx = _.map(serie.datapoints, row => _.concat(row, idx));
      return datapointsWithSerieIdx;
    });
    // TODO: fix types
    // @ts-ignore
    return _.concat(...datapointsList);
  }
}

// it is used with Vue.component, e.g.: Vue.component('chartwerk-scatter-pod', VueChartwerkScatterPodObject)
export const VueChartwerkScatterPodObject = {
  // alternative to `template: '<div class="chartwerk-scatter-pod" :id="id" />'`
  render(createElement) {
    return createElement(
      'div',
      {
        class: { 'chartwerk-scatter-pod': true },
        attrs: { id: this.id }
      }
    );
  },
  mixins: [VueChartwerkPodMixin],
  methods: {
    render() {
      const pod = new ChartwerkScatterPod(document.getElementById(this.id), this.series, this.options);
      pod.render();
    }
  }
};

export { ScatterData, ScatterOptions, TickOrientation, TimeFormat, PointType, LineType };
