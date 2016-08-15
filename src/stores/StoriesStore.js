import _ from 'underscore';
import alt from '../alt';
import storiesServerActions from '../actions/StoriesServerActions';
import storiesActions from '../actions/StoriesActions';
import accountServerActions from '../actions/AccountServerActions';
import accountStore from './AccountStore';

class StoriesStore {
  constructor () {
    this.bindActions(storiesActions);
    this.bindActions(storiesServerActions);
    this.bindActions(accountServerActions);
    this.results = [];
    this.recommended = [];
    this.stories = [];
    this.query = null;
    this.nextPage = null;
    this.previousPage = null;
    this.currentPage = 1;
    this.totalPage = null;
    this.storiesLoading = false;
    this.recommendedLoading = false;
    this.resultsLoading = false;
    this.error = null;
  }

  error ({error}) {
    this.setState({error: error, storiesLoading: false, recommendedLoading: false, resultsLoading: false});
  }

  stories () {
    this.setState({storiesError: null, storiesLoading: true});
  }

  storiesLoading () {
    this.setState({storiesLoading: true});
  }

  storiesUpdated ({stories}) {
    let accountState = accountStore.getState();

    if (accountState.username && accountState.verified) {
      this.setState({stories, storiesLoading: false});
    } else {
      this.setState({stories: [], storiesLoading: false});
    }
  }

  search ({query, page}) {
    if (this.query === query) {
      let previousPage = (page - 1 < 1) ? 1 : page - 1;
      let nextPage = (page + 1 > this.totalPage) ? this.totalPage : page + 1;
      this.setState({query: query, error: null, resultsLoading: true, currentPage: page, nextPage: nextPage, previousPage: previousPage});
    } else {
      this.setState({query: query, error: null, resultsLoading: true, nextPage: null, previousPage: null, currentPage: 1, totalPage: null});
    }
  }

  resultsUpdated ({stories, page, previous, next, total}) {
    this.setState({results: stories, currentPage: page, previousPage: previous, nextPage: next, totalPage: total, resultsLoading: false});
  }

  recommended () {
    this.setState({error: null, recommendedLoading: true});
  }

  recommendedUpdated ({stories}) {
    this.setState({recommended: stories, recommendedLoading: false});
  }

  loggedout () {
    this.setState({stories: []});
  }

  static all () {
    let state = this.getState();
    let all = [
      {"user":"kitematic","name":"hello-world-nginx","namespace":"kitematic","status":1,"description":"A light-weight nginx container that demonstrates the features of Kitematic","is_private":false,"is_automated":false,"can_edit":false,"star_count":52,"pull_count":475885,"last_updated":"2015-06-16T05:30:26.091578Z","has_starred":false,"full_description":"","permissions":{"read":true,"write":false,"admin":false},"is_recommended":true,"repo":"kitematic/hello-world-nginx","gradient_start":"#24B8EB","gradient_end":"#218CF4","img":"kitematic_html.png"}
    ];
    let uniqueStory = _.uniq(all, false,
      stories => {
        console.log(stories);
        stories.namespace + '/' + stories.name
      })

    return uniqueStory
  }

  static loading () {
    let state = this.getState();
    return false;
  }
}

export default alt.createStore(StoriesStore);
