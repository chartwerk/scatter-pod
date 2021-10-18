import { ScatterData, PointType } from './types';

import { Delaunay } from 'd3-delaunay';

import * as _ from 'lodash';
import * as d3 from 'd3'; // only types


export class DelaunayDiagram {
  private _delaunayData: number[][]; // [ 0:y, 1:x, ..., last:serieIdx ][]
  private _delaunayDiagram: any;

  constructor(
      protected series: ScatterData[],
      xScale: d3.ScaleLinear<number, number>, yScale: (string) => d3.ScaleLinear<number, number>, // TODO: bad, but idk how to do it better
    ) {
    this._delaunayData = this.getDatapointsForDelaunay();
    console.log('this._delaunayData', this._delaunayData);
    console.log('scales', yScale);
    this.setDelaunayDiagram(xScale, yScale);
  }

  public get data(): number[][] | undefined {
    if(!this._delaunayData || this._delaunayData.length === 0) {
      return undefined;
    }
    return this._delaunayData;
  }

  public setDelaunayDiagram(xScale: d3.ScaleLinear<number, number>, yScale: (string) => d3.ScaleLinear<number, number>) {
    if(!this._delaunayData) {
      console.warn('No data for delaunay initialization');
      return;
    }
    console.time('delaunay-init');
    this._delaunayDiagram = Delaunay.from(
      this._delaunayData,
      (d: number[]) => xScale(d[1]),
      (d: number[]) => yScale(this.series[_.last(d)].yOrientation)(d[0]),
    );
    console.timeEnd('delaunay-init');
  }

  public findPointIndex(eventX: number, eventY: number): number | undefined {
    if(!this._delaunayDiagram) {
      return undefined;
    }
    let pointIndex = this._delaunayDiagram.find(eventX, eventY);
    if(pointIndex === -1) {
      return undefined;
    }
    // TODO: add search radius via https://github.com/d3/d3-delaunay/issues/45
    return pointIndex;
  }

  public getDataRowByIndex(index: number): number[] | undefined {
    if(!this.data) {
      return undefined;
    }
    return this.data[index];
  }

  protected getDatapointsForDelaunay(): number[][] | undefined {
    // here we union all datapoints with point render type(circle or rectangle)
    // it means that circles and rectangles will be highlighted(not lines)
    const seriesForPointType = this.series.filter((serie: ScatterData) => serie.pointType !== PointType.NONE);
    if(seriesForPointType.length === 0) {
      return undefined; // to avoid ts error
    }
    return this.concatSeriesDatapoints(seriesForPointType);
  }

  protected concatSeriesDatapoints(series: ScatterData[]): number[][] {
    // return type row: [ 0:y, 1:x, 2?:custom value, last:serieIdx ]
    const datapointsList = _.map(series, serie => {
      const serieIdx = this.getSerieIdxByTarget(serie.target);
      const datapointsWithOptions = _.map(serie.datapoints, row => _.concat(...row, serieIdx));
      return datapointsWithOptions;
    });
    // @ts-ignore
    return _.concat(...datapointsList);
  }

  protected getSerieIdxByTarget(target: string): number {
    const idx = _.findIndex(this.series, serie => serie.target === target);
    if(idx === -1) {
      throw new Error(`Can't find serie with target: ${target}`);
    }
    return idx;
  }
}
