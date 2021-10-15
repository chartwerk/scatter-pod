import { ChartwerkPod, VueChartwerkPodMixin, TickOrientation, TimeFormat, yAxisOrientation, CrosshairOrientation, PanOrientation } from '@chartwerk/core';
import { ScatterData, ScatterOptions, PointType, LineType, ColorFormatter } from './types';

import { Delaunay } from 'd3-delaunay';

import * as d3 from 'd3';
import * as _ from 'lodash';

// TODO: use pod state with defaults
const DEFAULT_POINT_SIZE = 4;
const POINT_HIGHLIGHT_DIAMETER = 4;
const CROSSHAIR_BACKGROUND_OPACITY = 0.3;
const DEFAULT_POINT_TYPE = PointType.CIRCLE;
const DEFAULT_LINE_TYPE = LineType.NONE;
const DEFAULT_LINE_DASHED_AMOUNT = 4;

export class ChartwerkScatterPod extends ChartwerkPod<ScatterData, ScatterOptions> {
  _metricsContainer: any;
  _delaunayDiagram: any;
  _delaunayDiagramY1: any;
  _delaunayData: any[][];
  _delaunayDataY1: any[][];

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
      const orientation = this.series[idx].yOrientation;
      this.renderLines(
        this.series[idx].datapoints,
        {
          color: this.getSerieColor(idx),
          colorFormatter: this.series[idx].colorFormatter,
          target,
          pointType,
          lineType,
          pointSize,
          orientation,
        }
      );
    }
    this._delaunayData = this.getDatapointsForDelaunayY();
    // TODO: temporary hack
    this._delaunayDataY1 = this.getDatapointsForDelaunayY1();
    this.renderAllPoints();
    this.delaunayDiagramInit();
  }

  public rescaleMetricAndAxis(event: d3.D3ZoomEvent<any, any>): void {
    // TODO: this method is overwrite super. remove duplicates
    this.isPanning = true;
    this.onMouseOut();

    this.onPanningRescale(event);

    const shouldClearState = false;
    this.clearScaleCache(shouldClearState);
    this.renderYAxis();
    this.renderXAxis();

    this.chartContainer.select('.metrics-rect')
      .attr('transform', `translate(${this.state.transform.x},${this.state.transform.y}), scale(${this.state.transform.k})`);
    // TODO: move metric-rect to core. Now it is in Pod
    this.chartContainer.selectAll('.metric-el')
      .attr('transform', `translate(${this.state.transform.x},${this.state.transform.y}), scale(${this.state.transform.k})`);
  }

  protected renderXAxis(): void {
    if(this.options.axis.x.isActive === false) {
      return;
    }
    this.chartContainer.select('#x-axis-container').remove();
    this.xAxisElement = this.chartContainer
      .append('g')
      .attr('transform', `translate(0,${this.height})`)
      .attr('id', 'x-axis-container')
      .call(
        this.d3.axisBottom(this.xScale)
          .ticks(this.options.axis.x.ticksCount)
          .tickSize(2)
          .tickFormat(this.getAxisTicksFormatter(this.options.axis.x))
      );
    this.chartContainer.select('#x-axis-container').selectAll('.tick').selectAll('text')
      .style('transform', this.xTickTransform);
  }

  protected updateCrosshair(): void {
    // TODO: Crosshair class, which can be used as Pod
    this.appendCrosshairPoints();
  }

  appendCrosshairPoints(): void {
    this.series.forEach((serie: ScatterData, serieIdx: number) => {
      this.appendCrosshairPoint(serieIdx);
    });
  }

  protected appendCrosshairPoint(serieIdx: number): void {
    // TODO: add Crosshair type options
    const pointType = this.series[serieIdx].pointType || DEFAULT_POINT_TYPE;
    switch(pointType) {
      case PointType.NONE:
        return;
      case PointType.CIRCLE:
        this.crosshair.append('circle')
          .attr('class', `crosshair-point crosshair-point-${serieIdx} crosshair-background`)
          .attr('r', this.getCrosshairCircleBackgroundSize(serieIdx))
          .attr('clip-path', `url(#${this.rectClipId})`)
          .style('opacity', CROSSHAIR_BACKGROUND_OPACITY)
          .style('pointer-events', 'none')
          .style('display', 'none');
        return;
      case PointType.RECTANGLE:
        this.crosshair.append('rect')
          .attr('class', `crosshair-point crosshair-point-${serieIdx} crosshair-background`)
          .attr('width', this.getCrosshairCircleBackgroundSize(serieIdx))
          .attr('height', this.getCrosshairCircleBackgroundSize(serieIdx))
          .attr('clip-path', `url(#${this.rectClipId})`)
          .style('opacity', CROSSHAIR_BACKGROUND_OPACITY)
          .style('pointer-events', 'none')
          .style('display', 'none');
          return;
      default:
        throw new Error(`Unknown render point type: ${pointType}`);
    }
  }

  protected renderLines(
    datapoints: number[][],
    metricOptions: {
      color: string,
      colorFormatter: ColorFormatter,
      target: string,
      pointType: PointType,
      lineType: LineType,
      pointSize: number,
      orientation: yAxisOrientation
    }
  ): void {
    // this.renderPoints(datapoints, metricOptions.pointType, metricOptions.pointSize, metricOptions.colorFormatter || metricOptions.color, metricOptions.orientation, serieIdx);
    this.renderLine(datapoints, metricOptions.lineType, metricOptions.color, metricOptions.orientation);
  }

  renderLine(datapoints: number[][], lineType: LineType, color: string, orientation: yAxisOrientation): void {
    if(lineType === LineType.NONE) {
      return;
    }
    let strokeDasharray;
    // TODO: move to option
    if(lineType === LineType.DASHED) {
      strokeDasharray = DEFAULT_LINE_DASHED_AMOUNT;
    }
    const lineGenerator = this.d3.line()
      .x((d: [number, number]) => this.xScale(d[1]))
      .y((d: [number, number]) => this.getYScale(orientation)(d[0]));

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

  protected renderAllPoints(): void {
    const data = _.concat(this._delaunayData || [], this._delaunayDataY1 || []);
    this._metricsContainer.selectAll(null)
      .data(data)
      .enter()
      .append('circle')
      .attr('class', (d, i: number) => `metric-element metric-circle point-${i}`)
      .attr('r', d => d[7])
      .style('fill', d => d[5])
      .style('pointer-events', 'none')
      .attr('cx', (d: any[]) => this.xScale(d[1]))
      .attr('cy', (d: any[]) => this.getYScale(d[8])(d[0]));  
  }

  protected renderPoints(datapoints: number[][], pointType: PointType, pointSize: number, color: string | ColorFormatter, orientation: yAxisOrientation, serieIdx: number): void {
    switch(pointType) {
      case PointType.NONE:
        return;
      case PointType.CIRCLE:
        this._metricsContainer.selectAll(null)
          .data(datapoints)
          .enter()
          .append('circle')
          .attr('class', (d, i: number) => `metric-element metric-circle point-${1}`)
          .attr('r', pointSize)
          .style('fill', color)
          .style('pointer-events', 'none')
          .attr('cx', (d: [number, number]) => this.xScale(d[1]))
          .attr('cy', (d: [number, number]) => this.getYScale(orientation)(d[0]));
        return;
      case PointType.RECTANGLE:
        this._metricsContainer.selectAll(null)
          .data(datapoints)
          .enter()
          .append('rect')
          .attr('class', `metric-element metric-rect`)
          .style('fill', color)
          .style('pointer-events', 'none')
          .attr('x', (d: [number, number]) => this.xScale(d[1]) - pointSize / 2)
          .attr('y', (d: [number, number]) => this.getYScale(orientation)(d[0]) - pointSize / 2)
          .attr('width', pointSize)
          .attr('height', pointSize);
          return;
      default:
        throw new Error(`Unknown render point type: ${pointType}`);
    }
  }

  protected delaunayDiagramInit(): void {
    if(this._delaunayData) {
      console.time('delaunay-init');
      this._delaunayDiagram = Delaunay.from(
        this._delaunayData,
        d => this.xScale(d[1]),
        d => this.yScale(d[0])
      );
      console.timeEnd('delaunay-init');
    }
    if(this._delaunayDataY1) {
      this._delaunayDiagram = Delaunay.from(
        this._delaunayDataY1,
        d => this.xScale(d[1]),
        d => this.y1Scale(d[0])
      );
    }
  }

  onPanningEnd(): void {
    this.isPanning = false;
    this.onMouseOut();
    this.delaunayDiagramInit();
    if(this.options.eventsCallbacks !== undefined && this.options.eventsCallbacks.panningEnd !== undefined) {
      this.options.eventsCallbacks.panningEnd([this.state.xValueRange, this.state.yValueRange, this.state.y1ValueRange]);
    } else {
      console.log('on panning end, but there is no callback');
    }
  }

  unhighlight(): void {
    this.crosshair.selectAll('.crosshair-point').style('display', 'none');
  }

  highlight(pointIdx: number) {
    this.unhighlight();

    const datapoint = this._delaunayData[pointIdx];
    if(datapoint !== undefined && datapoint !== null) {
      const serieIdx = datapoint[3];
      const serieOrientation = this.series[serieIdx].yOrientation;
      const size = this.getCrosshairCircleBackgroundSize(serieIdx);
      const colorFormatter = this.series[serieIdx].colorFormatter;
      this.crosshair.selectAll(`.crosshair-point-${serieIdx}`)
        .attr('cx', this.xScale(datapoint[1]))
        .attr('cy', this.getYScale(serieOrientation)(datapoint[0]))
        .attr('x', this.xScale(datapoint[1]) - size / 2)
        .attr('y', this.getYScale(serieOrientation)(datapoint[0]) - size / 2)
        .attr('fill', colorFormatter !== undefined ? colorFormatter(datapoint) : this.series[serieIdx].color)
        .style('display', null);
    }
  }

  protected getCrosshairCircleBackgroundSize(serieIdx: number): number {
    const seriePointSize = this.series[serieIdx].pointSize || DEFAULT_POINT_SIZE;
    const pointType = this.series[serieIdx].pointType || DEFAULT_POINT_TYPE;
    let highlightDiameter = POINT_HIGHLIGHT_DIAMETER;
    if(pointType === PointType.RECTANGLE) {
      highlightDiameter = highlightDiameter * 2;
    }
    return seriePointSize + highlightDiameter;
  }

  public renderSharedCrosshair(values: { x?: number, y?: number }): void {
    this.onMouseOver(); // TODO: refactor to use it once
    const eventX = this.xScale(values.x);
    const eventY = this.yScale(values.y);
    this.moveCrosshairLine(eventX, eventY);
    const datapoints = this.findAndHighlightDatapoints(values.x, values.y);

    if(this.options.eventsCallbacks === undefined || this.options.eventsCallbacks.sharedCrosshairMove === undefined) {
      console.log('Shared crosshair move, but there is no callback');
      return;
    }

    this.options.eventsCallbacks.sharedCrosshairMove({
      datapoints,
      eventX, eventY
    });
  }

  moveCrosshairLine(xPosition: number, yPosition: number): void {
    switch (this.options.crosshair.orientation) {
      case CrosshairOrientation.VERTICAL:
        this.crosshair.select('#crosshair-line-x')
          .attr('x1', xPosition)
          .attr('x2', xPosition);
        return;
      case CrosshairOrientation.HORIZONTAL:
        this.crosshair.select('#crosshair-line-y')
          .attr('y1', yPosition)
          .attr('y2', yPosition);
        return;
      case CrosshairOrientation.BOTH:
        this.crosshair.select('#crosshair-line-x')
          .attr('x1', xPosition)
          .attr('x2', xPosition);
        this.crosshair.select('#crosshair-line-y')
          .attr('y1', yPosition)
          .attr('y2', yPosition);
        return;
      default:
        throw new Error(`Unknown type of crosshair orientaion: ${this.options.crosshair.orientation}`);
    }
  }

  findAndHighlightDatapoints(eventX: number, eventY: number): { values: any[], pointIdx: number } | null {
    // return: array of higlighted points or null
    if(this.series === undefined || this.series.length === 0) {
      return null;
    }
    const pointIndex = this.findPointIndexByDelaunay(eventX, eventY);
    console.log('point', pointIndex);
    if(pointIndex === undefined) {
      this.unhighlight();
      return null;
    }
    this.highlight(pointIndex);
    console.log('values', this._delaunayData[pointIndex]);
    return {
      values: this._delaunayData[pointIndex],
      pointIdx: pointIndex,
    };
  }

  protected getYScale(orientation: yAxisOrientation): d3.ScaleLinear<number, number> {
    if(orientation === undefined || orientation === yAxisOrientation.BOTH) {
      return this.yScale;
    }
    switch(orientation) {
      case yAxisOrientation.LEFT:
        return this.yScale;
      case yAxisOrientation.RIGHT:
        return this.y1Scale;
      default:
        throw new Error(`Unknown type of y axis orientation: ${orientation}`)   
    }
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

    this.moveCrosshairLine(eventX, eventY);

    const highlighted = this.findAndHighlightDatapoints(eventX, eventY);
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

  findPointIndexByDelaunay(eventX, eventY): number | undefined {
    if(!this._delaunayDiagram) {
      return undefined;
    }
    let pointIndex = this._delaunayDiagram.find(eventX, eventY);
    if(pointIndex === -1) {
      return pointIndex = undefined;
    }
    let pointIndexy1;
    if(this._delaunayDiagramY1) {
      pointIndexy1 = this._delaunayDiagramY1.find(eventX, eventY);
      if(pointIndexy1 === -1) {
        pointIndexy1 = undefined;
      }
    }
    return pointIndex || pointIndexy1;
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

  getDatapointsForDelaunay(series: ScatterData[]): number[][] | undefined {
    // here we union all datapoints with point render type(circle or rectangle)
    // it means that circles and rectangles will be highlighted(not lines)
    const seriesForPointType = series.filter((serie: ScatterData) => serie.pointType !== PointType.NONE);
    if(seriesForPointType.length === 0) {
      return undefined; // to avoid ts error
    }
    return this.concatSeriesDatapoints(seriesForPointType);
  }

  getDatapointsForDelaunayY(): number[][] | undefined {
    const seriesForY = this.series.filter(serie => this.filterSeriesByOrientation(serie.yOrientation, yAxisOrientation.LEFT));
    if(seriesForY.length === 0) {
      return undefined; // to avoid ts error
    }
    return this.getDatapointsForDelaunay(seriesForY);
  }

  getDatapointsForDelaunayY1(): number[][] | undefined {
    const seriesForY1 = this.series.filter(serie => serie.yOrientation === yAxisOrientation.RIGHT);
    if(seriesForY1.length === 0) {
      return undefined; // to avoid ts error
    }
    return this.getDatapointsForDelaunay(seriesForY1);
  }

  getAllDatapointsY(): number[][] | undefined {
    const seriesForY = this.series.filter(serie => this.filterSeriesByOrientation(serie.yOrientation, yAxisOrientation.LEFT));
    if(seriesForY.length === 0) {
      return undefined; // to avoid ts error
    }
    return this.concatSeriesDatapoints(seriesForY);
  }

  filterSeriesByOrientation(serieOrientation: yAxisOrientation, orientation: yAxisOrientation): boolean {
    if(serieOrientation === undefined || serieOrientation === yAxisOrientation.BOTH) {
      return true;
    }
    return serieOrientation === orientation;
  }

  concatSeriesDatapoints(series: ScatterData[]): any[][] {
    // return type row: [ 0:y, 1:x, 2:custom value????, 3:serieIdx, 4:pointType, 5:color, 6:target, 7:pointSize, 8: orientation ]
    const datapointsList = _.map(series, serie => {
      const serieIdx = this.getSerieIdxByTarget(serie.target);
      const color = serie.color; // TODO: use serie.colorFormatter
      const target = serie.target;
      const pointType = serie.pointType || DEFAULT_POINT_TYPE;
      const pointSize = serie.pointSize || DEFAULT_POINT_SIZE;
      const orientation = serie.yOrientation;
      // @ts-ignore
      const datapointsWithOptions = _.map(serie.datapoints, row => _.concat(row[0], row[1], row[3], serieIdx, pointType, color, target, pointSize, orientation));
      return datapointsWithOptions;
    });
    // @ts-ignore
    return _.concat(...datapointsList);
  }

  getSerieIdxByTarget(target: string): number {
    const idx = _.findIndex(this.series, serie => serie.target === target);
    if(idx === -1) {
      throw new Error(`Can't find serie with target: ${target}`);
    }
    return idx;
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
      if(this.pod === undefined) { 
        this.pod = new ChartwerkScatterPod(document.getElementById(this.id), this.series, this.options);
        this.pod.render();
      } else {
        this.pod.updateData(this.series, this.options);
      }
    },
  }
};

export { ScatterData, ScatterOptions, TickOrientation, TimeFormat, PointType, LineType };
