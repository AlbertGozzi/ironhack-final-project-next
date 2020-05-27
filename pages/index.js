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

const AUX_WORDS = ['by']
const OPERATION_TYPES = ['create', 'update', 'delete'];
const ELEMENTS = ['chart', 'xAxis', 'yAxis'];
const PARAMETERS = {
    chart: ['type', 'variables', 'height', 'width'], // Type can be 'stacked', clustered
    xaxis: ['min', 'max'],
    yaxis: ['min', 'max'],
};
 
const index = () => {
  const [workbook, setWorkbook] = useState();
  const [data, setData] = useState(initialData);
  const [variables, setVariables] = useState(Object.keys(data[0]).map((variable, i) => ({name: variable, id: i, type: typeof(data[1][variable])}) ));
  const [dataAvailable, setDataAvailable] = useState(true);
  const [dv, setDv] = useState();
  const operationsMap = { 
    chart: {
      create (parameters) {
        let [variables, type] = [parameters.variables, parameters.type];
  
        [this.y, this.x, this.adjust] = [...variables];
        this.displayY = this.y;
        
        this.data(data);
        
        if(!type) {
          const dv = new DataSet.DataView().source(data);
          this.displayY = `Sum of ${this.y}`;
          dv.transform({
            type: 'aggregate',
            fields: [this.y], 
            operations: ['sum'],
            as: [this.displayY],
            groupBy: [this.x], 
          });
              
          // Data loading
          this.data(dv.rows);

          this.interval().position(`${this.x}*${this.displayY}`);

        } else {
          switch (type[0]) {
            case 'stacked':
              this
                .interval()
                .position(`${this.x}*${this.y}`)
                .adjust('stack')
                .color(this.adjust)
              break;
            case 'clustered':
              this
              .interval()
              .position(`${this.x}*${this.y}`)
                .adjust([
                  {
                    type: 'dodge',
                    marginRatio: 0,
                  },
                ])
              .color(this.adjust);
              break;
            default:  
              break;
          }
        }
      },
      update (parameters) {
        this.scale(y, {
          min: 0,
          max: 4,
          nice: true,
        })
      },
    },
    yaxis: {
      update (parameters) {
        let config = {};
        PARAMETERS.yaxis.forEach(param => { if(parameters[param]) {config[param] = parameters[param] * 1} });
        this.scale(this.displayY, config)
      },
    }
  }

  class customChart extends Chart {
    constructor(parameters) {
      super(parameters);
      this.x = '';
      this.y = '';
      this.displayY = '';
      this.adjust = '';
    }
    
    apply (callback, parameters) {
      callback.apply(this, parameters);
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
  const lex = (str) => str.split(' ').map(s => s.trim().toLowerCase()).filter(word => !AUX_WORDS.includes(word));

  // Parser
  const parse = tokens => {
      let c = 0;

      let parameterName = '';
      let parameterValues = [];

      const peek = () => tokens[c];
      const consume = () => tokens[c++];

      console.log(tokens);

      const parseAndAddParameters = (element) => {
          parameterName = consume();
          parameterValues = [];

          while(peek() && !PARAMETERS[element.element].includes(peek())) {
              parameterValues.push(consume());
          }

          return [parameterName, parameterValues];
      }

      const parseElement = () => {
          const element = { element: consume(), type: 'element', parameters: {} };

          while (peek()) {
              let parameterNameAndValues = parseAndAddParameters(element);
              element.parameters[parameterNameAndValues[0]] = parameterNameAndValues[1];
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
      return {operation: operationsMap[element.element][opType], parameters: element.parameters};
  }

  useEffect( () => {
    let myChart = new customChart({
      container: 'chart-container',
      autoFit: false,
      width: 600,
      height: 300,
      padding: [50, 50, 50, 50],
    });

    // let output = evaluate(parse(lex('create chart type clustered variables value by phone by feature'))); 
    let output = evaluate(parse(lex('create chart variables value by phone'))); 
    myChart.apply(output.operation, [output.parameters])

    output = evaluate(parse(lex('update yAxis min 1.5 max 2.2')));
    console.log(output);
    myChart.apply(output.operation, [output.parameters])

    myChart.render();

  }, [data, dataAvailable])

  // useEffect( () => {
  //   let x = 'phone';
  //   let y = 'value';

  //   // Definition
  //   const chart = new Chart({
  //       container: 'chart-container',
  //       autoFit: false,
  //       width: 600,
  //       height: 300,
  //       padding: [30, 30, 60, 60],
  //   });

  //   // Data transformation
  //   const dv = new DataSet.DataView().source(data);

  //   let displayY = `Sum of ${y}`;

  //   dv.transform({
  //     type: 'aggregate',
  //     fields: [y], 
  //     operations: ['sum'],
  //     as: [displayY],
  //     groupBy: [x], 
  //   });
    
  //   // Data loading
  //   chart.data(dv.rows);

  //   // Define scales
  //   chart.scale(displayY, {
  //     min: 1.5,
  //     max: 2.2,
  //     // nice: true,
  //   })

  //   chart
  //   .interval()
  //   .position(`${x}*${displayY}`)

  //   // Chart rendering
  //   chart.render();

  // }, [data, dataAvailable])


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