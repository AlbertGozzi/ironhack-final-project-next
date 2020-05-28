import React from 'react'
import { useState, useEffect, useRef } from 'react'
import { Upload, Icon, message, Button, Divider, Input } from 'antd';
import { UploadOutlined, FieldNumberOutlined, FieldStringOutlined, RocketOutlined } from '@ant-design/icons';
import { Chart } from '@antv/g2';
import * as XLSX from "xlsx";
import DataSet from '@antv/data-set';
import { initialData } from '../components/initialData.js';
import isHotkey from 'is-hotkey';

// const make_cols = refstr => {
// 	let o = [], C = XLSX.utils.decode_range(refstr).e.c + 1;
// 	for(var i = 0; i < C; ++i) o[i] = {name:XLSX.utils.encode_col(i), key:i}
// 	return o;
// };

const AUX_WORDS = ['by']
const OPERATION_TYPES = ['create', 'update', 'delete'];
const ELEMENTS = ['chart', 'xaxis', 'yaxis'];
const CHART_CONFIG_PARAMETERS = ['height', 'width', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left']
const CHART_CONFIG_PARAMETERS_PADDING = ['padding-top', 'padding-right', 'padding-bottom', 'padding-left']
const PARAMETERS = {
    chart: ['type', 'variables', 'height', 'width', 'padding-left', 'padding-right', 'padding-top', 'padding-bottom'], // Type can be 'stacked', clustered, bar
    xaxis: ['min', 'max'],
    yaxis: ['min', 'max'],
};
const HOTKEYS = {
  'mod+k': 'displayCommandBar',
  // 'mod+i': 'italic',
  // 'mod+u': 'underline'
};

let defaultChartConfig = {
  container: 'chart',
  autoFit: false,
  width: 800,
  height: 500,
  padding: [50, 50, 50, 50],
}

const index = () => {
  const [workbook, setWorkbook] = useState();
  const [data, setData] = useState(initialData);
  const [variables, setVariables] = useState(Object.keys(data[0]).map((variable, i) => ({name: variable, id: i, type: typeof(data[1][variable])}) ));
  const [dataAvailable, setDataAvailable] = useState(true);
  const [displayCommandBar, setDisplayCommandBar] = useState(false);
  const [commands, setCommands] = useState([]);
  const chartConfig = useRef(defaultChartConfig);
  const chartConfigParameters = useRef([]);
  
  const operationsMap = { 
    chart: {
      create (parameters) {
        let [variables, type] = [parameters.variables, parameters.type];
  
        [this.y, this.x, this.adjust] = [...variables];
        this.displayY = this.y;
        
        this.data(data);

        if (type && type.includes('bar')) { this.coordinate().transpose() }
        
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
    },
    yaxis: {
      update (parameters) {
        let config = {};
        PARAMETERS.yaxis.forEach(param => {if(parameters[param]) {config[param] = parameters[param]} });
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

      const parseAndAddParameters = (element) => {
          parameterName = consume();
          parameterValues = [];

          while(peek() && !PARAMETERS[element.element].includes(peek())) {
            parameterValues.push(isNaN(peek() * 1) ? consume() : consume() * 1);
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

  const addCommand = str => {
    //TODO improve
    if (str === 'delete commands') { 
      setCommands([]) 
      return;
    }

    let ast = parse(lex(str));

    // Remove chart config parameters before pushing them to commands list
    ast.operations.forEach((operation, i) => {

      // Remove operation parameter
      Object.keys(operation.parameters).forEach(parameter => {
        if (CHART_CONFIG_PARAMETERS.includes(parameter)) { 
          chartConfigParameters.current[parameter] = operation.parameters[parameter];
          delete operation.parameters[parameter];
        }
      })

      // Remove whole operation if empty
      if (!Object.keys(operation.parameters).length) { ast.operations.splice(i);}

    });

    // Only push if there are any operations left
    console.log(ast)
    if (ast.operations.length) setCommands(commands => [...commands, ast]);
    console.log(commands)
  }

  const submitCommand = e => {
    addCommand(e.target.value);
    setDisplayCommandBar(false);
  }
    
  useEffect(() => {
    const handleKeyPress = (event) => {
      for (const hotkey in HOTKEYS) {
        if (isHotkey(hotkey, event)) {
          event.preventDefault()
          switch (HOTKEYS[hotkey]) {
            case 'displayCommandBar':
              setDisplayCommandBar(displayCommandBar => !displayCommandBar);
              break;
            default: 
              break;
          }
        }
      }
    }
    window.addEventListener("keydown", handleKeyPress );
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  useEffect( () => {

    // Delete all prior charts
    let chartContainer = document.getElementById("chart-container");
    chartContainer.innerHTML = `<div id="chart"> </div>`;

    // Add all commands
    // addCommand('create chart type clustered variables value by phone by feature'); 
    // addCommand('create chart type stacked bar variables value by phone by feature'); 
    // addCommand('update chart padding-left 0');
    // addCommand('update chart padding-left 200');
    // addCommand('update yAxis max 5');
    // addCommand('update yAxis min 0');

    // Apply all config related commands
    CHART_CONFIG_PARAMETERS.forEach(parameter => {
      let inputtedParameters = Object.keys(chartConfigParameters.current);
      if (inputtedParameters.includes(parameter)) {
        chartConfig.current[parameter] = chartConfigParameters.current[parameter][0];

        if (CHART_CONFIG_PARAMETERS_PADDING.includes(parameter)) {
          let padding = chartConfig.current.padding;
          switch (parameter) {
            case 'padding-top':
              padding[0] = chartConfigParameters.current[parameter][0];
              break;
            case 'padding-right':
              padding[1] = chartConfigParameters.current[parameter][0];
              break;
            case 'padding-bottom':
              padding[2] = chartConfigParameters.current[parameter][0];
              break;
            case 'padding-left':
              padding[3] = chartConfigParameters.current[parameter][0];
              break;
          }
          chartConfig.current.padding = padding;
        }

      }
    })

    let myChart = new customChart(chartConfig.current);

    // Merge commands
    let commandsMergedByOpType = OPERATION_TYPES.map(opType => {
      let opTypeCommands = commands.filter(command => command.operationType === opType);
      let opTypeMergedOperations = opTypeCommands.flatMap(command => command.operations);
      return { operationType: opType, type: "OpType", operations: opTypeMergedOperations };
    }).filter(ops => ops.operations[0]);

    // Merge operations for each command
    let fullyMergedCommands = commandsMergedByOpType.map(command => {
      let operationElements = command.operations.map(operation => operation.element).filter((element, index, arr) => arr.indexOf(element) === index);
      let fullyMergedOperations = operationElements.map(opElement => {
        let mergedParameters = {};
        command.operations.filter(operation => operation.element === opElement).forEach(operation => {
          mergedParameters = {...mergedParameters, ...operation.parameters};
        });
        return {element: opElement, type: "element", parameters: mergedParameters}
      });
      return { operationType: command.operationType, type: command.type, operations: fullyMergedOperations }
    });

    // Apply all commands
    fullyMergedCommands.forEach(ast => {
      let opType = ast.operationType;

      ast.operations.forEach(element => { 
        let operation = operationsMap[element.element][opType]
        let parameters = element.parameters;  
        myChart.apply(operation, [parameters]);
      })
    })

    myChart.render();

  }, [data, dataAvailable, commands])

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
        {displayCommandBar && <div className="commandBar">
          <div className="commandBarHeader">
            <RocketOutlined className="icon" style={{ fontSize: '1.5em'}} />
            <h4>Aleph Commands</h4>
          </div>
          <Divider style={{ 'backgroundColor': 'white', margin: '1em 0'}}/>
          <Input autoFocus placeholder="Input your command here." onPressEnter={() => submitCommand(event)}/>          
        </div>}
      </div>
  );
}
 
export default index;