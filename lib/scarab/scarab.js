// (c) 2017 Mapzen
//
// MAPZEN SCARAB (aka BUG for US BROADCAST TELEVISION and DOG in the UK)
// http://en.wikipedia.org/wiki/Digital_on-screen_graphic
//
// Identifies full-screen demo pages with Mapzen brand and provides helpful
// social media links.
// ----------------------------------------------------------------------------
/* global module, ga */
var MapzenScarab = (function () {
  'use strict'

  var DEFAULT_LINK = 'https://mapzen.com/'
  var TRACKING_CATEGORY = 'demo'
  var ANALYTICS_PROPERTY_ID = 'UA-47035811-1'

  // Globals
  var opts
    // opts.name      Name of demo
    // opts.link      Link to go to
    // opts.tweet     prewritten tweet
    // opts.analytics track?
    // opts.repo      Link to GitHub repository
    // opts.description Information about map

  var infoDescriptionEl

  function _track (action, label, value, nonInteraction) {
    if (opts.analytics === false) return false

    if (typeof ga === 'undefined') {
      return false
    }

    ga('send', 'event', TRACKING_CATEGORY, action, label, value, nonInteraction)
  }

  function _loadAnalytics () {
    /* eslint-disable */
    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
    })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

    ga('create', ANALYTICS_PROPERTY_ID, 'auto');
    ga('send', 'pageview');
    /* eslint-enable */
  }

  function _popupWindow (url, title, w, h) {
    // Borrowed from rrssb
    // Fixes dual-screen position                         Most browsers      Firefox
    var dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screen.left
    var dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screen.top

    var width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : window.screen.width
    var height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : window.screen.height

    var left = ((width / 2) - (w / 2)) + dualScreenLeft
    var top = ((height / 3) - (h / 3)) + dualScreenTop

    var newWindow = window.open(url, title, 'scrollbars=yes, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left)

    // Puts focus on the newWindow
    if (window.focus) {
      newWindow.focus()
    }
  }

  function _buildTwitterLink () {
    var base = 'https://twitter.com/intent/tweet'
    var url = encodeURIComponent(window.location.href)
    var text
    var params

    if (opts.tweet) {
      text = encodeURIComponent(opts.tweet)
    } else if (opts.name) {
      text = encodeURIComponent(opts.name + ', powered by @mapzen')
    } else {
      text = encodeURIComponent('Check out this project by @mapzen!')
    }

    params = '?text=' + text + '&url=' + url
    return base + params
  }

  function _buildFacebookLink () {
    var base = 'https://www.facebook.com/sharer/sharer.php?u='
    var url = encodeURIComponent(window.location.href)
    return base + url
  }

  function _createElsAndAppend () {
    var mapzenLink = opts.link || DEFAULT_LINK
    var mapzenTitle = (opts.name) ? opts.name + ' · Powered by Mapzen' : 'Powered by Mapzen'
    var el = document.createElement('div')

    // Create container
    el.id = 'mz-bug'
    el.className = 'mz-bug-container'
    el.setAttribute('role', 'widget')

    // Create buttons
    var mapzenEl = _createButtonEl('mapzen', mapzenLink, mapzenTitle, _onClickMapzen)
    var twitterEl = _createButtonEl('twitter', _buildTwitterLink(), 'Share this on Twitter', _onClickTwitter)
    var facebookEl = _createButtonEl('facebook', _buildFacebookLink(), 'Share this on Facebook', _onClickFacebook)

    // Build DOM
    el.appendChild(mapzenEl)
    el.appendChild(twitterEl)
    el.appendChild(facebookEl)

    // Creating github icon button if needed
    if (opts.repo) {
      var githubEl = _createButtonEl('github', opts.repo, 'View source on GitHub', _onClickGitHub)
      el.appendChild(githubEl)
    }

    // Creating info button and adding to container only if description is provided
    if (opts.description) {
      var infoEl = _createInfoButton('info', _onClickInfo)
      el.appendChild(infoEl)
    }

    document.body.appendChild(el)
    return el
  }

  function _createInfoButton(id, clickHandler) {
    var infoButton = document.createElement('div')
    var infoLogo = document.createElement('div')
    infoLogo.className = 'mz-bug-' + id + '-logo'
    infoLogo.addEventListener('click', clickHandler)
    infoButton.className = 'mz-bug-' + id
    infoButton.className += ' mz-bug-icons'

    infoButton.appendChild(infoLogo)
    return infoButton
  }

  function _createButtonEl (id, linkHref, linkTitle, clickHandler) {
    var linkEl = document.createElement('a')
    var logoEl = document.createElement('div')

    logoEl.className = 'mz-bug-' + id + '-logo'
    linkEl.href = linkHref
    linkEl.target = '_blank'
    linkEl.className = 'mz-bug-' + id + '-link'
    linkEl.className += ' mz-bug-icons'
    linkEl.title = linkTitle
    linkEl.addEventListener('click', clickHandler)

    linkEl.appendChild(logoEl)
    return linkEl
  }

  function _onClickMapzen (event) {
    _track('click', 'mapzen logo', opts.name)
  }

  function _onClickTwitter (event) {
    event.preventDefault()
    var link = _buildTwitterLink()
    _popupWindow(link, 'Twitter', 580, 470)
    _track('click', 'twitter', opts.name)
  }

  function _onClickFacebook (event) {
    event.preventDefault()
    var link = _buildFacebookLink()
    _popupWindow(link, 'Facebook', 580, 470)
    _track('click', 'facebook', opts.name)
  }

  function _onClickGitHub (event) {
    _track('click', 'github', opts.name)
  }

  // Clicking info button should lead to pop up description to open up
  // Clicking info button again should lead to description box closing
  // If no description provided, do not open description box
  function _onClickInfo(event) {
    var elem = infoDescriptionEl
    if (elem.style.display === 'block') {
      elem.style.display = 'none'
    } else {
      elem.style.display = 'block'
    }
  }

  function _buildDescription(id, container) {
    var infoBox = document.createElement('div')
    infoBox.className = "mz-bug-" + id
    infoBox.textContent = opts.description 
    infoBox.style.width = container.offsetWidth + 'px'
    infoBox.style.marginLeft = container.style.marginLeft

    document.body.appendChild(infoBox)
    return infoBox
  }

  function resizeDescription(container) {
    var containerWidth = container.offsetWidth 
    infoDescriptionEl.style.width = containerWidth + 'px'
    infoDescriptionEl.style.marginLeft = container.style.marginLeft
  }

  function centerScarab(container) {
    var containerWidth = container.offsetWidth
    var offsetMargin = -1 * containerWidth / 2
    container.style.marginLeft = offsetMargin + 'px'
  }

  var MapzenScarab = function (options) {
    // nifty JS constructor pattern via browserify documentation
    // https://github.com/substack/browserify-handbook#reusable-components
    if (!(this instanceof MapzenScarab)) return new MapzenScarab(options)

    // If iframed, exit & do nothing.
    if (window.self !== window.top) {
      return false
    }

    this.setOptions(options)

    this.el = _createElsAndAppend()
    this.twitterEl = this.el.querySelector('.mz-bug-twitter-link')
    this.facebookEl = this.el.querySelector('.mz-bug-facebook-link')

    centerScarab(this.el);
    window.addEventListener('resize', function(event) {
      centerScarab(this.el)
    }.bind(this))

    // Build links
    this.rebuildLinks()
    // Rebuild links if hash changes
    window.onhashchange = function () {
      this.rebuildLinks()
    }.bind(this)

    if (opts.description) {
      infoDescriptionEl = _buildDescription('description', this.el)
      window.addEventListener('resize', function(event) {
        resizeDescription(this.el)
      }.bind(this))
    }

    // Check if Google Analytics is present soon in the future; if not, load it.
    window.setTimeout(function () {
      if (typeof ga === 'undefined') {
        _loadAnalytics()
        _track('analytics', 'fallback', null, true)
      }

      _track('bug', 'active', opts.name, true)
    }, 0)
  }

  MapzenScarab.prototype.rebuildLinks = function () {
    this.twitterEl.href = _buildTwitterLink()
    this.facebookEl.href = _buildFacebookLink()
  }

  MapzenScarab.prototype.hide = function () {
    this.el.style.display = 'none'
  }

  MapzenScarab.prototype.show = function () {
    this.el.style.display = 'block'
  }

  MapzenScarab.prototype.setOptions = function (options) {
    // Default options
    opts = opts || {
      analytics: true,
      name: null
    }

    // Copy options values
    if (typeof options === 'object') {
      for (var i in options) {
        opts[i] = options[i]
      }
    }

    this.opts = opts
  }

  return MapzenScarab
}())

// Export as browserify module if present, otherwise, it is global to window
if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = MapzenScarab
} else {
  window.MapzenScarab = MapzenScarab
}
