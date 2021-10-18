import { ChartwerkPod, VueChartwerkPodMixin, TickOrientation, TimeFormat, yAxisOrientation, CrosshairOrientation, PanOrientation } from '@chartwerk/core';
import { ScatterData, ScatterOptions, PointType, LineType, ColorFormatter } from './types';

import { DelaunayDiagram } from './delaunay';

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
  _delaunayDiagram: DelaunayDiagram;

  constructor(el: HTMLElement, _series: ScatterData[] = [], _options: ScatterOptions = {}) {
    super(d3, el, _series, _options);
  }

  renderMetrics(): void {
    if(this.series.length === 0) {
      this.renderNoDataPointsMessage();
      return;
    }
    this.updateCrosshair();    
    this.renderMetricConatiner();

    this._delaunayDiagram = new DelaunayDiagram(this.series, this.xScale, this.getYScale.bind(this));

    this.renderLines();
    this.renderPoints();
  }

  renderMetricConatiner(): void {
    // container for clip path
    const clipContatiner = this.chartContainer
      .append('g')
      .attr('clip-path', `url(#${this.rectClipId})`)
      .attr('class', 'metrics-container');
    // container for panning
    this._metricsContainer = clipContatiner
      .append('g')
      .attr('class', ' metrics-rect');
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

  protected renderLines(): void {
    this.series.forEach((serie, serieIdx) => {
      if(serie.visible === false) {
        return;
      }
      const lineType = serie.lineType || DEFAULT_LINE_TYPE;
      this.renderLine(serie.datapoints, lineType, this.getSerieColor(serieIdx), serie.yOrientation);
    });
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

  protected renderPoints(): void {
    if(!this._delaunayDiagram.data) {
      return;
    }

    this._metricsContainer.selectAll(null)
      .data(this._delaunayDiagram.data)
      .enter()
      .append('circle')
      .attr('class', (d, i: number) => `metric-element metric-circle point-${i}`)
      .attr('r', (d: number[]) => this.series[_.last(d)].pointSize || DEFAULT_POINT_SIZE)
      .style('fill', (d: number[]) => this.getSerieColor(_.last(d)))
      .style('pointer-events', 'none')
      .attr('cx', (d: any[]) => this.xScale(d[1]))
      .attr('cy', (d: any[]) => this.getYScale(this.series[_.last(d)].yOrientation)(d[0]));

    // TODO: add rectangle
    // case PointType.RECTANGLE:
    // this._metricsContainer.selectAll(null)
    //   .data(datapoints)
    //   .enter()
    //   .append('rect')
    //   .attr('class', `metric-element metric-rect`)
    //   .style('fill', color)
    //   .style('pointer-events', 'none')
    //   .attr('x', (d: [number, number]) => this.xScale(d[1]) - pointSize / 2)
    //   .attr('y', (d: [number, number]) => this.getYScale(orientation)(d[0]) - pointSize / 2)
    //   .attr('width', pointSize)
    //   .attr('height', pointSize);
  }

  onPanningEnd(): void {
    this.isPanning = false;
    this.onMouseOut();
    this._delaunayDiagram.setDelaunayDiagram(this.xScale, this.getYScale.bind(this));
    if(this.options.eventsCallbacks !== undefined && this.options.eventsCallbacks.panningEnd !== undefined) {
      this.options.eventsCallbacks.panningEnd([this.state.xValueRange, this.state.yValueRange, this.state.y1ValueRange]);
    } else {
      console.log('on panning end, but there is no callback');
    }
  }

  unhighlight(): void {
    this.crosshair.selectAll('.crosshair-point').style('display', 'none');
  }

  highlight(pointIdx: number): void {
    this.unhighlight();

    const datapoint = this._delaunayDiagram.getDataRowByIndex(pointIdx);
    if(datapoint === undefined || datapoint === null) {
      return;
    }

    const serieIdx = _.last(datapoint);
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
    if(this.series === undefined || this.series.length === 0) {
      return null;
    }
  
    const pointIndex = this._delaunayDiagram.findPointIndex(eventX, eventY);
    if(pointIndex === undefined) {
      this.unhighlight();
      return null;
    }
    this.highlight(pointIndex);

    return {
      values: this._delaunayDiagram.data[pointIndex],
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

    // TODO: seems isOutOfChart is deprecated (check clippath correctness)
    if(this.isOutOfChart() === true || this.isPanning === true || this.isBrushing === true) {
      this.crosshair.style('display', 'none');
      return;
    } else {
      this.crosshair.style('display', null);
    }

    this.moveCrosshairLine(eventX, eventY);

    // TOOD: it should be two different methods
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
