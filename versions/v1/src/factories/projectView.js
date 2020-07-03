import {Calculate, Request} from '../utils';
import {IssueRepository, ProjectRepository} from '../repositories';
import { map, pick, split } from 'lodash';
import config from 'configs';

class ProjectView {

  static async sync() {
    const repositories = split(config.PROJECT_REPOSITORIES, ',');
    const projects = await Promise.all(map(repositories, async repository => {
      const result = await Request.do({
        baseURL: config.GITHUB_API_BASE_URL
      }, {
        method: 'GET',
        url: `repos/${repository}`,
        headers: {
          authorization: `Bearer ${config.GITHUB_TOKEN}`
        }
      });

      const data = pick(result, [
        'id', 'name', 'full_name', 'open_issues'
      ]);

      return ProjectRepository.createOrUpdate({
        id: data.id,
        name: data.name
      });
    }));

    return projects;
  }

  static async updateMetrics() {
    const projects = await ProjectRepository.findAll({ attributes: ['id', 'name'] });
    const totalIssue = await IssueRepository.findCount();
    
    for (const project of projects) {
      const issues = await IssueRepository.findAll(0, 25, { projectId: project.id });
      const fixedTimes = map(issues, issue => issue.fixedTime);
      const avgTimeIssue = Calculate.avg(fixedTimes);
      const stdTimeIssue = Calculate.standartDeviation(fixedTimes, avgTimeIssue);
      
      await ProjectRepository.update({ 
        id: project.id,
        openIssues: totalIssue,
        avgTimeIssue,
        stdTimeIssue
      });
    }
  }

}

export default ProjectView;