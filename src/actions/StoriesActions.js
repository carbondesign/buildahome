import alt from '../alt';
import regHubUtil from '../utils/RegHubUtil';

class StoriesActions {
  recommended () {
    this.dispatch({});
    regHubUtil.recommended();
  }

  search (query, page = 1) {
    this.dispatch({query, page});
    regHubUtil.search(query, page);
  }

  stories () {
    this.dispatch({});
    regHubUtil.stories();
  }
}

export default alt.createActions(StoriesActions);
