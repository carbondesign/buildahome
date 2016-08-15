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
    let all = state.recommended.concat(state.stories).concat(state.results);
    return _.uniq(all, false, stories => stories.namespace + '/' + stories.name);
  }

  static loading () {
    let state = this.getState();
    return state.recommendedLoading || state.resultsLoading || state.storiesLoading;
  }
}

export default alt.createStore(StoriesStore);
