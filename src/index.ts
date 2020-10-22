import { ChartwerkBase, VueChartwerkBaseMixin, TickOrientation, TimeFormat } from '@chartwerk/base';
import { ScatterData, ScatterOptions, RenderType } from './types';

import * as d3 from 'd3';
import * as _ from 'lodash';

// TODO: use pod state with defaults
const DEFAULT_POINT_SIZE = 4;
export class ChartwerkScatterPod extends ChartwerkBase<ScatterData, ScatterOptions> {
  _metricsContainer: any;
  _voronoiDiagram: any;
  _voronoiRadius: number;

  constructor(el: HTMLElement, _series: ScatterData[] = [], _options: ScatterOptions = {}) {
    // @ts-ignore
    super(d3, el, _series, _options);
  }

  _renderMetrics(): void {
    if(this._series.length === 0) {
      this._renderNoDataPointsMessage();
      return;
    }
    // container for clip path
    const clipContatiner = this._chartContainer
      .append('g')
      .attr('clip-path', `url(#${this.rectClipId})`)
      .attr('class', 'metrics-container');
    // container for panning
    this._metricsContainer = clipContatiner
      .append('g')
      .attr('class', ' metrics-rect')

    for(let idx = 0; idx < this._series.length; ++idx) {
      if(this._series[idx].visible === false) {
        continue;
      }
      const target = this._series[idx].target;
      const renderType = this._series[idx].renderType;
      const pointSize = this._series[idx].pointSize || DEFAULT_POINT_SIZE;
      this._renderMetric(
        this._series[idx].datapoints,
        { color: this.getSerieColor(idx), target, renderType, pointSize }
      );
    }
    this._voronoiDiagramInit();
  }

  _renderMetric(
    datapoints: number[][],
    metricOptions: {
      color: string,
      target: string,
      renderType: RenderType,
      pointSize: number
    }
  ): void {
    this._metricsContainer.selectAll(null)
      .data(datapoints)
      .enter()
      .append('circle')
      .attr('class', `metric-element metric-circle`)
      .attr('r', metricOptions.pointSize)
      .style('fill', metricOptions.color)
      .style('pointer-events', 'none')
      .attr('cx', (d: [number, number]) => this.xScale(d[1]))
      .attr('cy', (d: [number, number]) => this.yScale(d[0]));

    if(metricOptions.renderType === RenderType.LINE) {
      const lineGenerator = this._d3.line()
        .x((d: [number, number]) => this.xScale(d[1]))
        .y((d: [number, number]) => this.yScale(d[0]));

      this._metricsContainer
        .append('path')
        .datum(datapoints)
        .attr('class', 'metric-path')
        .attr('fill', 'none')
        .style('pointer-events', 'none')
        .attr('stroke', metricOptions.color)
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.7)
        .attr('d', lineGenerator);
    }
  }

  _voronoiDiagramInit(): void {
    const allDatapoints = this.getAllDatapoints();
    this._voronoiDiagram = d3.voronoi()
      .x(d => this.xScale(d[1]))
      .y(d => this.yScale(d[0]))
      // @ts-ignore
      .size([this.width, this.height])(allDatapoints);
    // TODO: move const to option;
    this._voronoiRadius = this.width / 10;
  }

  _onPanningEnd() {
    this._isPanning = false;
    this.onMouseOut();
    this._voronoiDiagramInit();
    console.log('on panning end scatter plot, but there is no callback');
  }

  unhighlight() {
    this._crosshair.select('.crosshair-circle').style('display', 'none');
  }

  highlight(d: [number, number, number]) {
    if(!d) {
      this.unhighlight();
    } else {
      this._crosshair.select('.crosshair-circle')
        .style('display', null)
        .attr('cx', this.xScale(d[1]))
        .attr('cy', this.yScale(d[0]))
        .attr('fill', this.getSerieColor(d[2]));
    }
  }

  public renderSharedCrosshair(timestamp: number): void {
    this._crosshair.style('display', null);
    this._crosshair.selectAll('.crosshair-circle')
      .style('display', 'none');

    const x = this.xScale(timestamp);
    this._crosshair.select('#crosshair-line-x')
      .attr('y1', 0).attr('x1', x)
      .attr('y2', this.height).attr('x2', x);
  }

  public hideSharedCrosshair(): void {
    this._crosshair.style('display', 'none');
  }

  onMouseMove(): void {
    const mousePosition = this._d3.mouse(this._chartContainer.node());
    const eventX = mousePosition[0];
    const eventY = mousePosition[1];
    if(this.isOutOfChart() === true || this._isPanning === true || this._isBrushing === true) {
      this._crosshair.style('display', 'none');
      return;
    } else {
      this._crosshair.style('display', null);
    }
    this._crosshair.select('#crosshair-line-x')
      .attr('x1', eventX)
      .attr('x2', eventX);
    this._crosshair.select('#crosshair-line-y')
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
    if(this._options.eventsCallbacks === undefined || this._options.eventsCallbacks.mouseMove === undefined) {
      console.log('Mouse move, but there is no callback');
      return;
    }
    // TODO: group fields
    this._options.eventsCallbacks.mouseMove({
      x: this._d3.event.clientX,
      y: this._d3.event.clientY,
      xval: this.xScale.invert(eventX),
      yval: this.xScale.invert(eventY),
      highlighted,
      chartX: eventX,
      chartWidth: this.width
    });
  }

  onMouseOver(): void {
    if(this.isOutOfChart() === true || this._isPanning === true || this._isBrushing === true) {
      this._crosshair.style('display', 'none');
      return;
    }
    this._crosshair.style('display', null);
  }

  onMouseOut(): void {
    if(this._options.eventsCallbacks !== undefined && this._options.eventsCallbacks.mouseOut !== undefined) {
      this._options.eventsCallbacks.mouseOut();
    }
    this._crosshair.style('display', 'none');
  }

  getAllDatapoints(): number[][] {
    const datapointsList = _.map(this._series, (serie, idx) => {
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
  mixins: [VueChartwerkBaseMixin],
  methods: {
    render() {
      const pod = new ChartwerkScatterPod(document.getElementById(this.id), this.series, this.options);
      pod.render();
    }
  }
};

export { ScatterData, ScatterOptions, TickOrientation, TimeFormat };
