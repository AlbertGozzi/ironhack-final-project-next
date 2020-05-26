import React from 'react'
import { useState, useEffect } from 'react'
import { Upload, Icon, message, Button } from 'antd';
import { UploadOutlined, FieldNumberOutlined, FieldStringOutlined } from '@ant-design/icons';
import { Chart } from '@antv/g2';
import * as XLSX from "xlsx";
// import {Chart, Axis, Tooltip, Line, Point, Geom} from "bizcharts";
import DataSet from '@antv/data-set';
import { initialData } from '../components/initialData.js'

// const make_cols = refstr => {
// 	let o = [], C = XLSX.utils.decode_range(refstr).e.c + 1;
// 	for(var i = 0; i < C; ++i) o[i] = {name:XLSX.utils.encode_col(i), key:i}
// 	return o;
// };

const index = () => {
  const [workbook, setWorkbook] = useState();
  const [data, setData] = useState(initialData);
  const [variables, setVariables] = useState(Object.keys(data[0]).map((variable, i) => ({name: variable, id: i, type: typeof(data[1][variable])}) ));
  const [cols, setCols] = useState();
  const [dataAvailable, setDataAvailable] = useState(true);
  const [dv, setDv] = useState();

  const onImportExcel = info => {
    if( info.file.status === 'done') {
      let file = info.file.originFileObj;
      const fileReader = new FileReader();
      fileReader.onload = event => {
        try {
          const { result } = event.target;
          const wb = XLSX.read(result, { type: "binary" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          // const data = XLSX.utils.sheet_to_json(ws, {header:1});
          const data = XLSX.utils.sheet_to_json(ws);
          // const cols = make_cols(ws['!ref']);

          let variables = Object.keys(data[0]).map((variable, i) => ({name: variable, id: i, type: typeof(data[1][variable])}) );
          // .map(var => return {'name': var, 'type': typeof(var)});
          console.log(variables);
          setVariables(variables)

          const dv = new DataSet.DataView().source(data);

          // console.log(dv);
          // console.log("transform")

          dv.transform({
            type: 'aggregate',
            fields: [' Profit '], 
            operations: ['sum'],
            as: ['Total Profit'],
            groupBy: ['Country'], 
          });

          // console.log(data[1]);

          setWorkbook(wb);
          setData(data);
          setDataAvailable(true);
          // setCols(cols);
          setDv(dv);

          // console.log(dv);

          message.success("Upload success!");
        } catch (e) {
          console.log(e);
          message.error("File type is incorrect!");
        }
      };
      fileReader.readAsBinaryString(file);
    }
  };

  useEffect( () => {
    if (!dataAvailable) return;

    console.log(data);

    const chart = new Chart({
        container: 'chart-container',
        autoFit: true,
        width: 800,
        height: 300,
    });

    chart.data(data);

    chart
    .interval()
    // .adjust('stack')
    .position('phone*value')
    // .color('phone');

    chart.render();

  }, [dataAvailable])

  const displayVariables = () => {
    if (!dataAvailable) return;
    return variables.map((variable,i) => {
      return (
      <div key={i} className="variable">
        {variable.type === "string" && <FieldStringOutlined className="variableIcon" />}
        {variable.type === "number" && <FieldNumberOutlined className="variableIcon" />}
        <span>{variable.name}</span>
      </div>)
    });
  }

  const displaySheets = () => {
    if (!workbook) return;
    return workbook.SheetNames.map((name,i) => {
      return <p key={i}>{name}</p>
    });
  }

  // const displayChart = () => {
  //   if (!dv) return;
  //   return (
  //     <Chart padding={[50,50,50,150]} height={400} data={dv.rows} autoFit>
  //       <Tooltip/>
  //       <Geom
  //         type="interval"  
  //         position={{
  //             fields: [ 'Country' , 'Total Profit'],
  //         }}
  //         // color=" Profit "
  //       />
  //    </Chart>
  //   )
  // }

  // const displayChartG2 = () => {
  //   // if (!dataAvailable) return;

  //   console.log(data);

  //   const chart = new Chart({
  //       container: 'chart-container',
  //       autoFit: false,
  //       width: 800,
  //       height: 300,
  //   });

  //   chart.data(data);

  //   chart
  //   .interval()
  //   // .adjust('stack')
  //   .position('phone*value')
  //   // .color('phone');

  //   chart.render();
  // }

  return (
      <div className="main">
        <div className="data">
          <h2>Data</h2>
          <div className="upload">
            <Upload onChange={onImportExcel} multiple={false} >
              <Button>
                <UploadOutlined /> Upload
              </Button>
            </Upload>
          </div>
          <div className="variables">
            <h3>Variables</h3>
            {displayVariables()}
          </div>
        </div>
        <div className="chart">
          <h2>Chart</h2>
          <div id="chart-container"></div>
          {/* {displayChart()} */}
          {/* {displayChartG2()} */}
        </div>
      </div>
  );
}
 
export default index;