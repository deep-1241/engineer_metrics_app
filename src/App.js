import { useState } from "react";
import axios from "axios";
import { DatePicker, PageHeader, Table, Button } from 'antd';
import './App.css';

const { RangePicker } = DatePicker;

function App() {
  const owner = "merit";
  const repo = "ace-ohio";
  
  const [dataSource, setDataSource] = useState([]);
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name"
    },
    {
      title: "PR Count",
      dataIndex: "count",
      key: "count"
    },
    {
      title: "Additions",
      dataIndex: "additions",
      key: "additions"
    },
    {
      title: "Deletions",
      dataIndex: "deletions",
      key: "deletions"
    },
    {
      title: "Comments per PR",
      dataIndex: "comments",
      key: "comments"
    }
  ];

  let dateFrom = "";
  let dateTo = "";
  const onChange = (value, dateString) => {
    dateFrom = dateString[0];
    dateTo = dateString[1];
  };
  
  const onOk = (value) => {
  };

  async function getPullRequest () {
    let key = 0;
    const prApiResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state="closed"`,
      {
        headers: { 
          'Authorization': 'Bearer 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'
        }
      }
    );

    const prDataByDateFilter = prApiResponse.data;
    const prData = [];
    prDataByDateFilter.forEach(pr => {
      if(pr.created_at >= dateFrom && pr.created_at <= dateTo)
        prData.push(pr)
    });

    const prCleanedData = await Promise.all(prData.map(async (pr) => {
      const pullsUrl = pr.url;
      const prNumberUrl = `https://api.github.com/repos/merit/form214/pulls/${pr.number}/comments`;

      // Getting comments per PR
      const prCommentsApiResponse = await axios.get(
        prNumberUrl,
        {
          headers: { 
            'Authorization': 'Bearer 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'
          }
        }
      );

      const commentsData = prCommentsApiResponse.data;
      let personCommented = [];
      commentsData.forEach(item => {
        personCommented.push(item.user.login);
      });

      let commentCount = 0;
      personCommented.forEach(item => {
        if(pr.user.login === item)
          commentCount++;
      });

      // Getting commit data
      const pullApiResponse = await axios.get(
        pullsUrl,
        {
          headers: { 
            'Authorization': 'Bearer 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'
          }
        }
      );
      const pullData = pullApiResponse.data;
      key++;

      return {
        key: key,
        name: pr.user.login,
        comments: commentCount,
        additions: pullData.additions,
        deletions: pullData.deletions
      }
    }));
    
    // Creating a hash map from the cleaned data to combine pull requests from one person
    const prMap = new Map();

    prCleanedData.forEach(pr => {
      if (prMap.get(pr.name) === undefined) {
        pr.count = 1;
        prMap.set(pr.name, pr);
      } else {
        const existingData = prMap.get(pr.name);
        existingData.count++;
        existingData.comments += pr.comments;
        existingData.additions += pr.additions;
        existingData.deletions += pr.deletions;
        prMap.set(pr.name, existingData);
      }
    });

    const consolidatedPrData = Array.from(prMap.values());
    consolidatedPrData.forEach(item => {
      item.comments = (item.comments/item.count);
    });

    setDataSource(consolidatedPrData)
  }

  return (
    <div className="App">
      <PageHeader className="site-page-header" title="Engineer Metrics" subTitle="" />
      <div className="page-container">
        <div className="search-row">
          <RangePicker
            showTime={{
              format: 'HH:mm',
            }}
            format="YYYY-MM-DD HH:mm"
            onChange={onChange}
            onOk={onOk}
          />
        </div>
        <div className="submit-button">
          <Button type="primary" onClick={getPullRequest}>Get Metrics</Button>
        </div>
        <Table dataSource={dataSource} columns={columns} />
      </div>
    </div>
  );
}

export default App;
