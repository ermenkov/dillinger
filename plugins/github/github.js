var fs = require('fs')
  , path = require('path')
  , request = require('request')

var github_config = JSON.parse( fs.readFileSync( path.resolve(__dirname, 'github-config.json'), 'utf-8' ) )

exports.Github = (function(){
  
  var github_api = 'https://api.github.com/'
  
  // String builder for auth url...
  function _buildAuthUrl(){
    return  'https://github.com/login/oauth/authorize?client_id=' 
            + github_config.client_id 
            + '&scope=repo&redirect_uri=' 
            + github_config.callback_url
  }
  
  return {
    github_config: github_config,
    generateAuthUrl: function(req,res){
      return _buildAuthUrl()
    },
    getUsername: function(req,res,cb){
      
      var uri = github_api + 'user?access_token=' + req.session.github.oauth

      request.get(uri, function(err, resp, data){
        if(err) {
          console.error(err)
          return res.redirect(resp.statusCode)
        }
        else if(!err && resp.statusCode === 200) 
        {
          var d = JSON.parse(data)
          req.session.github.username = d.login 
          cb && cb()
        }
      }) // end request.get()
      
    }, // end getUsername
    searchForMdFiles: function(req,res){
      
      var uri = github_api + 'user/repos?access_token=' + req.session.github.oauth

      request.get(uri, function(e, r, d){
        if(e) {
          res.send(
            {
              error: 'Request error.' 
            , data: r.statusCode
            })
        }
        else if(!e && r.statusCode == 200) 
        {
          var set = []

          d = JSON.parse(d)

          d.forEach(function(el){

            var item = 
            {
              url: el.url
            , private: el.private
            }

            set.push(item)
          })

          res.json(set)

        } // end else if
        else{
          res.json({error: 'Unable to fetch repos from Github.'})
        }
      }) // end request callback
    }, // end searchForMdFiles
    fetchGithubBranches: function(req,res){
      
      var uri = github_api 
                        + 'repos/' 
                        + req.session.github.username 
                        + '/'
                        + req.body.repo
                        +'/branches?access_token=' + req.session.github.oauth

      request.get(uri, function(err, resp, data){
        if(err) {
          res.send(
            {
              error: 'Request error.' 
            , data: resp.statusCode
            })
        }
        else if(!err && resp.statusCode === 200) 
        {
          res.send(data)
        } // end else if
        else{
          res.json({error: 'Unable to fetch repos from Github.'})
        }
      }) // end request callback
      
    }, // end fetchGithubBranches
    fetchTreeFiles: function(req,res){

      // /repos/:user/:repo/git/trees/:sha

      var uri = github_api 
                        + 'repos/' 
                        + req.session.github.username 
                        + '/'
                        + req.body.repo
                        + '/git/trees/'
                        + req.body.sha + '?recursive=1&access_token=' + req.session.github.oauth

      request.get(uri, function(err, resp, data){
        if(err) {
          res.send(
            {
              error: 'Request error.' 
            , data: resp.statusCode
            })
        }
        else if(!err && resp.statusCode === 200) 
        {
          data = JSON.parse(data)
          res.json(data)
        } // end else if
        else{
          res.json({error: 'Unable to fetch repos from Github.'})
        }
      }) // end request callback
      
    }, // end fetchTreeFiles
    fetchFile: function(req,res){

      var url = req.body.mdFile
        , isPrivateRepo = /blob/.test(url)
        
      // https://api.github.com/octocat/Hello-World/git/blobs/44b4fc6d56897b048c772eb4087f854f46256132
      // If it is a private repo, we need to make an API call, because otherwise it is the raw file.
      if(isPrivateRepo){
        url += '?access_token=' + req.session.github.oauth
      }

      request.get(url, function(err, resp, data){
        if(err){
          res.send(
            {
              error: 'Request error.' 
            , data: resp.statusCode
            })
        }
        else if(!err && resp.statusCode === 200) 
        {

          var json_resp = 
          {
            data: data
          , error: false
          }

          if(isPrivateRepo){
            var d = JSON.parse(data)
            json_resp.data = (new Buffer(d.content, 'base64').toString('ascii'))
          }

          res.json(json_resp)

        } // end else if
        else{
          res.json({error: 'Unable to fetch file from Github.'})
        }
      }) // end request callback
    
    } // end fetchFile
  }
  
})()

