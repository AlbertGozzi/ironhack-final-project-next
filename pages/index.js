import React from 'react'
import { useState, useEffect } from 'react'
import { Upload, Icon, message, Button } from 'antd';
import { UploadOutlined, FieldNumberOutlined, FieldStringOutlined } from '@ant-design/icons';
import { Chart } from '@antv/g2';
import * as XLSX from "xlsx";
import DataSet from '@antv/data-set';
import { initialData } from '../components/initialData.js'

// const make_cols = refstr => {
// 	let o = [], C = XLSX.utils.decode_range(refstr).e.c + 1;
// 	for(var i = 0; i < C; ++i) o[i] = {name:XLSX.utils.encode_col(i), key:i}
// 	return o;
// };

const aux = ['by']
const operationTypes = ['create', 'update', 'delete'];
const elements = ['chart', 'xAxis', 'yAxis'];
const properties = {
    chart: ['type', 'data', 'height', 'width'],
    xAxis: ['min', 'max'],
    yAxis: ['min', 'max'],
};
 

const index = () => {
  const [workbook, setWorkbook] = useState();
  const [data, setData] = useState(initialData);
  const [variables, setVariables] = useState(Object.keys(data[0]).map((variable, i) => ({name: variable, id: i, type: typeof(data[1][variable])}) ));
  const [cols, setCols] = useState();
  const [dataAvailable, setDataAvailable] = useState(true);
  const [dv, setDv] = useState();
  const operationsMap = { 
    chart: {
        create (properties) {
          let variables = properties.data;

          let x = variables[1]
          let y = variables[0];
          let stack = variables[2];

          const chart = new Chart({
              container: 'chart-container',
              autoFit: false,
              width: 600,
              height: 300,
              padding: [50, 50, 50, 50],
          });

          chart.data(data);

          chart.height = 1000;

          chart
          .interval()
          .position(`${x}*${y}`)
          .adjust('stack')
          .color(stack)

          chart.render();
        },
        update (properties) {
          chart.scale(y, {
            min: 0,
            max: 4,
            nice: true,
          })
        },
    }
  }

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
          const data = XLSX.utils.sheet_to_json(ws);

          let variables = Object.keys(data[0]).map((variable, i) => ({name: variable, id: i, type: typeof(data[1][variable])}) );

          setVariables(variables)
          setWorkbook(wb);
          setData(data);
          setDataAvailable(true);

          message.success("Upload success!");

        } catch (e) {
          console.log(e);
          message.error("File type is incorrect!");
        }
      };
      fileReader.readAsBinaryString(file);
    }
  };

  // Lexer
  const lex = (str) => str.split(' ').map(s => s.trim().toLowerCase()).filter(word => !aux.includes(word));

  // Parser
  const parse = tokens => {
      let c = 0;

      let propertyName = '';
      let propertyValues = [];

      const peek = () => tokens[c];
      const consume = () => tokens[c++];

      const parseAndAddProperties = (element) => {
          propertyName = consume();
          propertyValues = [];

          while(peek() && !properties[element.element].includes(peek())) {
              propertyValues.push(consume());
          }

          return [propertyName, propertyValues];
      }

      const parseElement = () => {
          const element = { element: consume(), type: 'element', properties: {} };

          while (peek()) {
              let propertyNameAndValues = parseAndAddProperties(element);
              element.properties[propertyNameAndValues[0]] = propertyNameAndValues[1];
          };
          
          return element;
      }

      const parseInput = () => {
          const node = { operationType: consume(), type: 'OpType', operations: [] };
          while (peek()) node.operations.push(parseElement());
          return node;
      }

      return parseInput();
  };

  // Evaluator
  const evaluate = ast => {
      let element = ast.operations[0];
      let opType = ast.operationType;
      return operationsMap[element.element][opType](element.properties);
  }

  // useEffect( () => {
  //   if (!dataAvailable) return;

  //   let x = 'phone';
  //   let y = 'value';
  //   // let cluster = 'phone';

  //   // Definition
  //   const chart = new Chart({
  //       container: 'chart',
  //       autoFit: false,
  //       width: 600,
  //       height: 300,
  //       padding: [30, 30, 90, 60],
  //   });

  //   // Data transformation
  //   const dv = new DataSet.DataView().source(data);

  //   let displayY = `Sum of ${y}`;
  //   let displayY2 = `Count of ${y}`

  //   dv.transform({
  //     type: 'aggregate',
  //     fields: [y, y], 
  //     operations: ['sum', 'count'],
  //     as: [displayY, displayY2],
  //     groupBy: [x], 
  //   });
    
  //   console.log(dv.rows)
  //   // Data loading
  //   chart.data(dv.rows);

  //   // Define scales
  //   chart.scale(displayY, {
  //     nice: true,
  //   })
  //   chart.scale(displayY2, {
  //     min: 0,
  //     // max: 8,
  //     nice: true,
  //   })
  //   // chart.scale(x, {
  //   //   alias: toTitleCase(x),
  //   // })

  //   // Define axes titles
  //   chart.axis(displayY, {
  //     title: {
  //       style: {
  //           fill: 'black',
  //       },
  //       },
  //     }
  //   )

  //   chart.axis(displayY2, {
  //     title: {
  //       style: {
  //           fill: 'black',
  //       },
  //       },
  //     }
  //   )

  //   chart.axis(x, {
  //     title: {
  //       style: {
  //           fill: 'black',
  //       },
  //       },
  //     }
  //   )

  //   // Geometry creation
  
  //   // eval("chart.line().position(`${x}*${displayY}`)");      
  //   chart
  //   .interval()
  //   .position(`${x}*${displayY}`)

  //   chart
  //   .line()
  //   .position(`${x}*${displayY2}`);

  //   // Chart rendering
  //   chart.render();

  // }, [dataAvailable])

  useEffect( () => {
    evaluate(parse(lex('create chart type Stacked data value by phone by feature')));  
  }, [data, dataAvailable])

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

  return (
      <div className="main">
        <div className="section data">
          <h2 className="sectionTitle">Data</h2>
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
        <div className="section chart">
          <h2 className="sectionTitle">Chart</h2>
          <div id="chart-container">
            <div id="chart"></div>
          </div>
        </div>
      </div>
  );
}
 
export default index;