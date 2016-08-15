import _ from 'underscore';
import request from 'request';
import async from 'async';
import util from '../utils/Util';
import hubUtil from '../utils/HubUtil';
import repositoryServerActions from '../actions/RepositoryServerActions';
import tagServerActions from '../actions/TagServerActions';

let REGHUB2_ENDPOINT = process.env.REGHUB2_ENDPOINT || 'https://hub.docker.com/v2';
let searchReq = null;
let PAGING = 24;

module.exports = {
  // Normalizes results from search to v2 repository results
  normalize: function (repo) {
    let obj = _.clone(repo);
    if (obj.is_official) {
      obj.namespace = 'library';
    } else {
      let [namespace, name] = repo.name.split('/');
      obj.namespace = namespace;
      obj.name = name;
    }

    return obj;
  },

  search: function (query, page, sorting = null) {
    if (searchReq) {
      searchReq.abort();
      searchReq = null;
    }

    if (!query) {
      repositoryServerActions.resultsUpdated({repos: []});
    }
    /**
     * Sort:
     * All - no sorting
     * ordering: -start_count
     * ordering: -pull_count
     * is_automated: 1
     * is_official: 1
     */

    searchReq = request.get({
      url: `${REGHUB2_ENDPOINT}/search/repositories/?`,
      qs: {query: query, page: page, page_size: PAGING, sorting}
    }, (error, response, body) => {
      if (error) {
        repositoryServerActions.error({error});
      }

      let data = JSON.parse(body);
      let repos = _.map(data.results, result => {
        result.name = result.repo_name;
        return this.normalize(result);
      });
      let next = data.next;
      let previous = data.previous;
      let total = Math.floor(data.count / PAGING);
      if (response.statusCode === 200) {
        repositoryServerActions.resultsUpdated({repos, page, previous, next, total});
      }
    });
  },

  recommended: function () {
    request.get('https://kitematic.com/recommended.json', (error, response, body) => {
      if (error) {
        repositoryServerActions.error({error});
        return;
      }

      if (response.statusCode !== 200) {
        repositoryServerActions.error({error: new Error('Could not fetch recommended repo list. Please try again later.')});
        return;
      }

      let data = JSON.parse(body);
      let repos = data.repos;
      async.map(repos, (repo, cb) => {
        var name = repo.repo;
        if (util.isOfficialRepo(name)) {
          name = 'library/' + name;
        }

        request.get({
          url: `${REGHUB2_ENDPOINT}/repositories/${name}`
        }, (error, response, body) => {
          if (error) {
            repositoryServerActions.error({error});
            return;
          }

          if (response.statusCode === 200) {
            let data = JSON.parse(body);
            data.is_recommended = true;
            _.extend(data, repo);
            cb(null, data);
          } else {
            repositoryServerActions.error({error: new Error('Could not fetch repository information from Docker Hub.')});
            return;
          }

        });
      }, (error, repos) => {
        repositoryServerActions.recommendedUpdated({repos});
      });
    });
  },

  tags: function (repo, callback) {
    hubUtil.request({
      url: `${REGHUB2_ENDPOINT}/repositories/${repo}/tags`,
      qs: {page: 1, page_size: 100}
    }, (error, response, body) => {
      if (response.statusCode === 200) {
        let data = JSON.parse(body);
        tagServerActions.tagsUpdated({repo, tags: data.results || []});
        if (callback) {
          return callback(null, data.results || []);
        }
      } else {
        repositoryServerActions.error({repo});
        if (callback) {
          return callback(new Error('Failed to fetch tags for repo'));
        }
      }
    });
  },

  // stories: function(){
  //   var storyArray= [
  //     {
  //        "Id":"e5da88abf2827b24bc486275d0e9af785fc2208d5695de09ba9ca4bf136d2875",
  //        "Created":"2016-08-14T18:27:01.998029487Z",
  //        "Path":"/bin/sh",
  //        "Args":[
  //           "-c",
  //           "npm run clean"
  //        ],
  //        "State":{
  //           "Status":"exited",
  //           "Running":false,
  //           "Paused":false,
  //           "Restarting":false,
  //           "OOMKilled":false,
  //           "Dead":false,
  //           "Pid":0,
  //           "ExitCode":0,
  //           "Error":"",
  //           "StartedAt":"2016-08-14T18:27:02.100951601Z",
  //           "FinishedAt":"2016-08-14T18:27:02.407333561Z"
  //        },
  //        "Image":"sha256:b915620ec57fa0380a15da8f3c1a363bb6475d24bad3dabd35b757ae49a3f660",
  //        "ResolvConfPath":"/mnt/sda1/var/lib/docker/containers/e5da88abf2827b24bc486275d0e9af785fc2208d5695de09ba9ca4bf136d2875/resolv.conf",
  //        "HostnamePath":"/mnt/sda1/var/lib/docker/containers/e5da88abf2827b24bc486275d0e9af785fc2208d5695de09ba9ca4bf136d2875/hostname",
  //        "HostsPath":"/mnt/sda1/var/lib/docker/containers/e5da88abf2827b24bc486275d0e9af785fc2208d5695de09ba9ca4bf136d2875/hosts",
  //        "LogPath":"/mnt/sda1/var/lib/docker/containers/e5da88abf2827b24bc486275d0e9af785fc2208d5695de09ba9ca4bf136d2875/e5da88abf2827b24bc486275d0e9af785fc2208d5695de09ba9ca4bf136d2875-json.log",
  //        "Name":"big_euler",
  //        "RestartCount":0,
  //        "Driver":"aufs",
  //        "MountLabel":"",
  //        "ProcessLabel":"",
  //        "AppArmorProfile":"",
  //        "ExecIDs":null,
  //        "HostConfig":{
  //           "Binds":null,
  //           "ContainerIDFile":"",
  //           "LogConfig":{
  //              "Type":"json-file",
  //              "Config":{

  //              }
  //           },
  //           "NetworkMode":"default",
  //           "PortBindings":null,
  //           "RestartPolicy":{
  //              "Name":"",
  //              "MaximumRetryCount":0
  //           },
  //           "AutoRemove":false,
  //           "VolumeDriver":"",
  //           "VolumesFrom":null,
  //           "CapAdd":null,
  //           "CapDrop":null,
  //           "Dns":[

  //           ],
  //           "DnsOptions":[

  //           ],
  //           "DnsSearch":[

  //           ],
  //           "ExtraHosts":null,
  //           "GroupAdd":null,
  //           "IpcMode":"",
  //           "Cgroup":"",
  //           "Links":null,
  //           "OomScoreAdj":0,
  //           "PidMode":"",
  //           "Privileged":false,
  //           "PublishAllPorts":false,
  //           "ReadonlyRootfs":false,
  //           "SecurityOpt":null,
  //           "UTSMode":"",
  //           "UsernsMode":"",
  //           "ShmSize":67108864,
  //           "Runtime":"runc",
  //           "ConsoleSize":[
  //              0,
  //              0
  //           ],
  //           "Isolation":"",
  //           "CpuShares":0,
  //           "Memory":0,
  //           "CgroupParent":"",
  //           "BlkioWeight":0,
  //           "BlkioWeightDevice":null,
  //           "BlkioDeviceReadBps":null,
  //           "BlkioDeviceWriteBps":null,
  //           "BlkioDeviceReadIOps":null,
  //           "BlkioDeviceWriteIOps":null,
  //           "CpuPeriod":0,
  //           "CpuQuota":0,
  //           "CpusetCpus":"",
  //           "CpusetMems":"",
  //           "Devices":null,
  //           "DiskQuota":0,
  //           "KernelMemory":0,
  //           "MemoryReservation":0,
  //           "MemorySwap":0,
  //           "MemorySwappiness":-1,
  //           "OomKillDisable":false,
  //           "PidsLimit":0,
  //           "Ulimits":null,
  //           "CpuCount":0,
  //           "CpuPercent":0,
  //           "IOMaximumIOps":0,
  //           "IOMaximumBandwidth":0
  //        },
  //        "GraphDriver":{
  //           "Name":"aufs",
  //           "Data":null
  //        },
  //        "Mounts":[

  //        ],
  //        "Config":{
  //           "Hostname":"e5c68db50333",
  //           "Domainname":"",
  //           "User":"",
  //           "AttachStdin":false,
  //           "AttachStdout":false,
  //           "AttachStderr":false,
  //           "Tty":false,
  //           "OpenStdin":false,
  //           "StdinOnce":false,
  //           "Env":[
  //              "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
  //              "NPM_CONFIG_LOGLEVEL=info",
  //              "NODE_VERSION=4.3.2"
  //           ],
  //           "Cmd":[
  //              "/bin/sh",
  //              "-c",
  //              "npm run clean"
  //           ],
  //           "ArgsEscaped":true,
  //           "Image":"sha256:b915620ec57fa0380a15da8f3c1a363bb6475d24bad3dabd35b757ae49a3f660",
  //           "Volumes":null,
  //           "WorkingDir":"",
  //           "Entrypoint":null,
  //           "OnBuild":[

  //           ],
  //           "Labels":{

  //           }
  //        },
  //        "NetworkSettings":{
  //           "Bridge":"",
  //           "SandboxID":"7475c35ba80b95a6b8751891e7ab7c34580d4b03823c0fdc7a07d8c1f5e33b19",
  //           "HairpinMode":false,
  //           "LinkLocalIPv6Address":"",
  //           "LinkLocalIPv6PrefixLen":0,
  //           "Ports":null,
  //           "SandboxKey":"/var/run/docker/netns/7475c35ba80b",
  //           "SecondaryIPAddresses":null,
  //           "SecondaryIPv6Addresses":null,
  //           "EndpointID":"",
  //           "Gateway":"",
  //           "GlobalIPv6Address":"",
  //           "GlobalIPv6PrefixLen":0,
  //           "IPAddress":"",
  //           "IPPrefixLen":0,
  //           "IPv6Gateway":"",
  //           "MacAddress":"",
  //           "Networks":{
  //              "bridge":{
  //                 "IPAMConfig":null,
  //                 "Links":null,
  //                 "Aliases":null,
  //                 "NetworkID":"dadcbbee361872e0bc1837b194b516fd050f7acb0c9e346a8c93dae8eb8a9e95",
  //                 "EndpointID":"",
  //                 "Gateway":"",
  //                 "IPAddress":"",
  //                 "IPPrefixLen":0,
  //                 "IPv6Gateway":"",
  //                 "GlobalIPv6Address":"",
  //                 "GlobalIPv6PrefixLen":0,
  //                 "MacAddress":""
  //              }
  //           }
  //        }
  //     }
  //   ]
  //   return storyArray
  // },

  // Returns the base64 encoded index token or null if no token exists
  stories: function (callback) {
    repositoryServerActions.reposLoading({repos: []});
    let namespaces = [];
    // Get Orgs for user
    hubUtil.request({
      url: `${REGHUB2_ENDPOINT}/user/orgs/`,
      qs: { page_size: 1000 }
    }, (orgError, orgResponse, orgBody) => {
      if (orgError) {
        repositoryServerActions.error({orgError});
        if (callback) {
          return callback(orgError);
        }
        return null;
      }

      if (orgResponse.statusCode === 401) {
        hubUtil.logout();
        repositoryServerActions.reposUpdated({repos: []});
        return;
      }

      if (orgResponse.statusCode !== 200) {
        let generalError = new Error('Failed to fetch repos');
        repositoryServerActions.error({error: generalError});
        if (callback) {
          callback({error: generalError});
        }
        return null;
      }
      try {
        let orgs = JSON.parse(orgBody);
        orgs.results.map((org) => {
          namespaces.push(org.orgname);
        });
        // Add current user
        namespaces.push(hubUtil.username());
      } catch(jsonError) {
        repositoryServerActions.error({jsonError});
        if (callback) {
          return callback(jsonError);
        }
      }


      async.map(namespaces, (namespace, cb) => {
        hubUtil.request({
          url: `${REGHUB2_ENDPOINT}/repositories/${namespace}`,
          qs: { page_size: 1000 }
        }, (error, response, body) => {
          if (error) {
            repositoryServerActions.error({error});
            if (callback) {
              callback(error);
            }
            return null;
          }

          if (orgResponse.statusCode === 401) {
            hubUtil.logout();
            repositoryServerActions.reposUpdated({repos: []});
            return;
          }

          if (response.statusCode !== 200) {
            repositoryServerActions.error({error: new Error('Could not fetch repository information from Docker Hub.')});
            return null;
          }

          let data = JSON.parse(body);
          cb(null, data.results);
        });
      }, (error, lists) => {
        if (error) {
          repositoryServerActions.error({error});
          if (callback) {
            callback(error);
          }
          return null;
        }

        let repos = [];
        for (let list of lists) {
          repos = repos.concat(list);
        }

        _.each(repos, repo => {
          repo.is_user_repo = true;
        });

        repositoryServerActions.reposUpdated({repos});
        if (callback) {
          return callback(null, repos);
        }
        return null;
      });
    });
  }
};
