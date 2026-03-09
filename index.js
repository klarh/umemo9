(() => {
  // output/Main/foreign.js
  var getLocationHash = function() {
    return window.location.hash || "#/";
  };
  var setLocationHash = function(hash) {
    return function() {
      window.location.hash = hash;
    };
  };
  var onHashChange = function(callback) {
    return function() {
      window.addEventListener("hashchange", function() {
        callback(window.location.hash || "#/")();
      });
    };
  };
  var addKeyboardListener = function(callback) {
    return function() {
      if (window._playKeyHandler) {
        document.removeEventListener("keydown", window._playKeyHandler);
      }
      window._playKeyHandler = function(e) {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
        var pb = document.querySelector("#play-card-buttons");
        var answerShown = pb && pb.classList.contains("answer");
        callback(e.key)(answerShown)();
        e.preventDefault();
      };
      document.addEventListener("keydown", window._playKeyHandler);
    };
  };
  var setInnerHTML = function(id2) {
    return function(html) {
      return function() {
        var el = document.getElementById(id2);
        if (el) el.innerHTML = html;
      };
    };
  };
  var addClassById = function(id2) {
    return function(cls) {
      return function() {
        var el = document.getElementById(id2);
        if (el) el.classList.add(cls);
      };
    };
  };
  var callGlobal = function(name) {
    return function(arg) {
      return function() {
        if (typeof window[name] === "function") {
          window[name](arg);
        }
      };
    };
  };
  var setGlobal = function(name) {
    return function(value) {
      return function() {
        if (typeof value === "function" && value.length === 0) {
          window[name] = function() {
            value();
          };
        } else {
          window[name] = value;
        }
      };
    };
  };
  var downloadJson = function(jsonStr) {
    return function(filename) {
      return function() {
        var blob = new Blob([jsonStr], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
    };
  };
  var escapeHtml = function(str) {
    var div4 = document.createElement("div");
    div4.appendChild(document.createTextNode(str));
    return div4.innerHTML;
  };
  var registerDeleteDeckHandler = function(model) {
    return function() {
      window._deleteDeck = function(el) {
        var deckId = el.getAttribute("data-id");
        var title = el.getAttribute("data-title") || "this deck";
        if (!confirm('Delete "' + title + '"? This cannot be undone.')) return;
        var Port = window._portModule;
        if (!Port) return;
        var li = el.closest(".deck-item");
        if (li) li.remove();
        Port.deleteDeck(deckId)(function() {
          return function() {
            localStorage.removeItem("umemo_journal_" + deckId);
            if (window._deleteDeckFromDrive) {
              window._deleteDeckFromDrive(deckId);
            }
          };
        })();
      };
    };
  };
  var registerVoteHandler = function(model) {
    return function(ps) {
      return function() {
        window._vote = function(delta) {
          voteFromJs(model, ps, delta);
        };
      };
    };
  };
  var initPlaySyncPopover = function() {
    if (window._updatePlaySyncPopover) window._updatePlaySyncPopover();
  };
  function voteFromJs(model, ps, delta) {
    var Port = window._portModule;
    if (!Port) {
      console.error("Port module not loaded");
      return;
    }
    if (!ps.cardId || ps.cardId.value0 === void 0) return;
    var deckId = ps.deckId;
    var cardId = ps.cardId.value0;
    Port.getCardFaces(deckId)(cardId)(function(facesJson) {
      return function() {
        var currentMomentum = 1;
        if (ps.frontFace && ps.frontFace.value0) {
          currentMomentum = Math.max(1, ps.frontFace.value0.face.momentum);
        }
        var r = model.settings.learningRate;
        var m = Math.max(1, currentMomentum);
        var dm = 0;
        if (delta > 0) {
          dm = r * Math.pow(m, 1 - 1 / r) + r * (r - 1) / 2 * Math.pow(m, 1 - 2 / r) + r * (r - 1) * (r - 2) / 6 * Math.pow(m, 1 - 3 / r) + r * (r - 1) * (r - 2) * (r - 3) / 24 * Math.pow(m, 1 - 4 / r);
        } else if (delta < 0) {
          dm = -r * Math.pow(m, 1 - 1 / r) + r * (r - 1) / 2 * Math.pow(m, 1 - 2 / r) - r * (r - 1) * (r - 2) / 6 * Math.pow(m, 1 - 3 / r) + r * (r - 1) * (r - 2) * (r - 3) / 24 * Math.pow(m, 1 - 4 / r);
        }
        var newMomentum = Math.max(1, m + dm);
        var rank = Math.floor(newMomentum);
        var linked = true;
        if (ps.frontFace && ps.frontFace.value0) {
          linked = ps.frontFace.value0.face.linkSiblings;
        }
        var updatedFaces = facesJson.map(function(f) {
          var copy = Object.assign({}, f);
          var shouldUpdate = linked || ps.frontFace && ps.frontFace.value0 && f.faceId === ps.frontFace.value0.faceId;
          if (shouldUpdate) {
            copy.momentum = newMomentum;
            if (copy.contents) {
              copy.contents = Object.assign({}, copy.contents, { momentum: newMomentum });
            }
          }
          return copy;
        });
        Port.getPositionsAroundRank(deckId)(rank)(function(posInfo) {
          return function() {
            var PRIORITY_MAX = 2147483647;
            var PRIORITY_MIN = 0;
            var newPosition;
            if (rank === 0) {
              var minPos = posInfo.firstPos !== null ? posInfo.firstPos : PRIORITY_MAX;
              newPosition = (minPos + PRIORITY_MIN) / 2;
            } else if (rank < 0 || rank >= posInfo.total - 1) {
              var maxPos = posInfo.lastPos !== null ? posInfo.lastPos : PRIORITY_MIN;
              newPosition = (maxPos + PRIORITY_MAX) / 2;
            } else {
              if (posInfo.posAtRank !== null && posInfo.posAfterRank !== null) {
                newPosition = (posInfo.posAtRank + posInfo.posAfterRank) / 2;
              } else {
                var maxPos2 = posInfo.lastPos !== null ? posInfo.lastPos : PRIORITY_MIN;
                newPosition = (maxPos2 + PRIORITY_MAX) / 2;
              }
            }
            var q = Math.random();
            var priorities = updatedFaces.map(function(f) {
              return f.contents && f.contents.priority || 1;
            });
            var sum2 = 0;
            for (var i = 0; i < priorities.length; i++) sum2 += priorities[i];
            var cumSum = 0;
            var frontIdx = 0;
            for (var j = 0; j < priorities.length; j++) {
              cumSum += priorities[j];
              if (cumSum / sum2 > q) {
                frontIdx = j;
                break;
              }
            }
            var newFrontId = updatedFaces[frontIdx] ? updatedFaces[frontIdx].faceId : updatedFaces[0].faceId;
            var now = Date.now();
            var finalFaces = updatedFaces.map(function(f) {
              var copy = Object.assign({}, f);
              copy.position = copy.faceId === newFrontId ? newPosition : null;
              copy._ts = now;
              return copy;
            });
            Port.saveFacesWithCallback(finalFaces)(function() {
              return function() {
                if (window._appendJournal) {
                  window._appendJournal(deckId, {
                    faceId: newFrontId,
                    cardId,
                    momentum: newMomentum,
                    position: newPosition,
                    timestamp: Date.now()
                  });
                }
                _votesSinceSync = (_votesSinceSync || 0) + 1;
                if (_votesSinceSync >= _autoSyncThreshold && window._driveSyncModule && window._startBgPush) {
                  _votesSinceSync = 0;
                  setTimeout(window._startBgPush, 0);
                }
                _showNextCard(model, ps);
              };
            })();
          };
        })();
      };
    })();
  }
  function _showNextCard(model, ps) {
    var Port = window._portModule;
    if (!Port) {
      window.dispatchEvent(new Event("hashchange"));
      return;
    }
    Port.getFrontCardSpeculative(ps.deckId)(function(result) {
      return function() {
        if (result.empty) {
          var container = document.getElementById("card-container");
          if (container) container.innerHTML = '<div class="play-face"><p class="face-text">No cards in this deck</p></div>';
          return;
        }
        var html = "";
        for (var i = 0; i < result.faces.length; i++) {
          var f = result.faces[i];
          var isFront = f.faceId === result.frontFaceId;
          var c = f.contents || {};
          var idAttr = isFront ? ' id="answer-face"' : "";
          var content = _renderFaceContent(c);
          html += '<div class="face play-face"' + idAttr + ">" + content + "</div>";
        }
        var container = document.getElementById("card-container");
        if (container) {
          container.innerHTML = html;
          container.classList.remove("answer");
        }
        var buttons = document.getElementById("play-card-buttons");
        if (buttons) buttons.classList.remove("answer");
        ps.cardId = { value0: result.cardId };
        if (result.faces.length > 0) {
          var frontFace = result.faces.find(function(f2) {
            return f2.faceId === result.frontFaceId;
          }) || result.faces[0];
          ps.frontFace = { value0: { faceId: frontFace.faceId, face: _idbFaceToFace(frontFace) } };
        }
        ps.backFaces = result.faces.filter(function(f2) {
          return f2.faceId !== result.frontFaceId;
        }).map(function(f2) {
          return { faceId: f2.faceId, face: _idbFaceToFace(f2) };
        });
        Port.speculativePrefetch(ps.deckId)();
      };
    })();
  }
  function _escapeHtml(s) {
    if (!s) return "";
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function _idbFaceToFace(rec) {
    var c = rec.contents || {};
    return {
      faceType: c.faceType || c.type || "TextFace",
      priority: c.priority != null ? c.priority : 1,
      momentum: rec.momentum != null ? rec.momentum : 1,
      linkSiblings: rec.linkSiblings != null ? rec.linkSiblings : c.link_siblings != null ? c.link_siblings : true,
      text: c.text || "",
      src: c.src || "",
      alt: c.alt || "",
      label: c.label || ""
    };
  }
  function _renderFaceContent(c) {
    var type = c.type || "TextFace";
    if (type === "ImageFace") {
      if (!c.src) return '<p class="face-text">(no image)</p>';
      return '<div class="face-text"><img src="' + _escapeHtml(c.src) + '" alt="' + _escapeHtml(c.alt || "") + '" class="face-image"></div>';
    }
    if (type === "AudioFace") {
      if (!c.src) return '<p class="face-text">(no audio)</p>';
      var label = c.label ? "<p>" + _escapeHtml(c.label) + "</p>" : "";
      return '<div class="face-text">' + label + '<audio controls preload="metadata" class="face-audio"><source src="' + _escapeHtml(c.src) + '"></audio></div>';
    }
    if (type === "MarkdownFace") {
      return '<div class="face-text face-markdown">' + (c.text || "") + "</div>";
    }
    return '<p class="face-text">' + _escapeHtml(c.text || "") + "</p>";
  }
  var _votesSinceSync = 0;
  var _autoSyncThreshold = 30;
  var registerEditHandlers = function(deckId) {
    return function() {
      var model = {};
      window._saveMeta = function() {
        saveMeta(model)(deckId)();
      };
      window._saveFace = function(faceId, value, faceType) {
        saveFaceFromJs(model)(deckId)(faceId)(value)(faceType)();
      };
      window._deleteFace = function(faceId) {
        deleteFaceFromJs(model)(deckId)(faceId)();
      };
      window._addFace = function(faceType, cardId) {
        addFaceFromJs(model)(deckId)(faceType)(cardId)();
      };
      window._newCard = function() {
        newCardFromJs(model)(deckId)();
      };
      window._addSource = function() {
        addSourceFromJs(model)(deckId)();
      };
      window._removeSource = function(url) {
        removeSourceFromJs(model)(deckId)(url)();
      };
      window._syncSources = function() {
        syncSourcesFromJs(model)(deckId)();
      };
    };
  };
  var PAGE_SIZE = 50;
  var initCardPagination = function(deckId) {
    return function(totalCards) {
      return function(editable) {
        return function() {
          var totalPages = Math.ceil(totalCards / PAGE_SIZE);
          window._goToCardPage = function(page) {
            if (page < 0 || page >= totalPages) return;
            var Port = window._portModule;
            if (!Port) return;
            Port.getCardList(deckId)(page * PAGE_SIZE)(PAGE_SIZE)(function(cards) {
              return function() {
                var container = document.getElementById("card-list-container");
                if (!container) return;
                var html = "";
                for (var i = 0; i < cards.length; i++) {
                  var c = cards[i];
                  html += _renderCardHtml(c, editable, deckId);
                }
                container.innerHTML = html;
                var paginationEls = document.querySelectorAll("#card-pagination");
                var paginationHtml = _renderPaginationHtml(page, totalPages);
                paginationEls.forEach(function(el) {
                  el.innerHTML = paginationHtml;
                });
                container.scrollIntoView({ behavior: "smooth", block: "start" });
              };
            })();
          };
        };
      };
    };
  };
  function _renderCardHtml(card, editable, deckId) {
    var facesHtml = "";
    for (var f of card.faces) {
      facesHtml += _renderFaceHtml(f, editable, deckId);
    }
    var headHtml = editable ? _renderCardHeadHtml(deckId, card.cardId) : "";
    return '<div class="card">' + headHtml + facesHtml + "</div>";
  }
  function _renderCardHeadHtml(deckId, cardId) {
    return `<div class="card-head"><button onclick="window._addFace('text',` + cardId + `)">Text</button><button onclick="window._addFace('markdown',` + cardId + `)">Markdown</button><button onclick="window._addFace('image',` + cardId + `)">Image</button><button onclick="window._addFace('audio',` + cardId + ')">Audio</button></div>';
  }
  function _renderFaceHtml(f, editable, deckId) {
    var fid = f.faceId;
    var c = f.contents || {};
    var content = "";
    var guts = "";
    var faceType = c.type || "TextFace";
    if (faceType === "TextFace") {
      content = editable ? '<p class="face-text editable" contenteditable="plaintext-only" onblur="window._saveFace(' + fid + `,this.textContent,'TextFace')">` + _esc(c.text || "") + "</p>" : '<p class="face-text">' + _esc(c.text || "") + "</p>";
    } else if (faceType === "MarkdownFace") {
      content = editable ? '<div class="face-markdown"><textarea class="face-markdown-edit" rows="4" onblur="window._saveFace(' + fid + `,this.value,'MarkdownFace')">` + _esc(c.text || "") + "</textarea></div>" : '<div class="face-text face-markdown">' + (c.text || "") + "</div>";
    } else if (faceType === "ImageFace") {
      if (editable) {
        content = '<div class="face-image-edit"><input type="url" value="' + _esc(c.src || "") + '" placeholder="Image URL" onblur="window._saveFace(' + fid + `,this.value,'ImageFace_src')"><input type="text" value="` + _esc(c.alt || "") + '" placeholder="Alt text" onblur="window._saveFace(' + fid + `,this.value,'ImageFace_alt')">` + ((c.src || "") !== "" ? '<img src="' + _esc(c.src) + '" class="face-image">' : "") + "</div>";
      } else {
        content = (c.src || "") === "" ? '<p class="face-text">(no image)</p>' : '<div class="face-text"><img src="' + _esc(c.src) + '" alt="' + _esc(c.alt || "") + '" class="face-image"></div>';
      }
    } else if (faceType === "AudioFace") {
      if (editable) {
        content = '<div class="face-audio-edit"><input type="url" value="' + _esc(c.src || "") + '" placeholder="Audio URL" onblur="window._saveFace(' + fid + `,this.value,'AudioFace_src')"><input type="text" value="` + _esc(c.label || "") + '" placeholder="Label" onblur="window._saveFace(' + fid + `,this.value,'AudioFace_label')">` + ((c.src || "") !== "" ? '<audio controls class="face-audio"><source src="' + _esc(c.src) + '"></audio>' : "") + "</div>";
      } else {
        content = '<div class="face-text">' + _esc(c.label || c.src || "") + "</div>";
      }
    }
    if (editable) {
      guts = '<div class="face-guts"><button class="face-delete" onclick="window._deleteFace(' + fid + ')">\u2715 Delete face</button></div>';
    }
    return '<div class="face" data-face-id="' + fid + '">' + content + guts + "</div>";
  }
  function _esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function _renderPaginationHtml(page, totalPages) {
    var prevDisabled = page <= 0 ? " disabled" : "";
    var nextDisabled = page >= totalPages - 1 ? " disabled" : "";
    var prevPage = Math.max(0, page - 1);
    var nextPage = Math.min(totalPages - 1, page + 1);
    return '<button class="pagination-btn" onclick="window._goToCardPage(' + prevPage + ')"' + prevDisabled + '>\u2190 Prev</button> <span class="pagination-info">Page ' + (page + 1) + " of " + totalPages + '</span> <button class="pagination-btn" onclick="window._goToCardPage(' + nextPage + ')"' + nextDisabled + ">Next \u2192</button>";
  }
  var registerImportHandler = function(deckId) {
    return function() {
      var model = {};
      var meta = {};
      window._importSheet = function() {
        importSheetFromJs(model)(deckId)(meta)();
      };
    };
  };
  var saveMeta = function(model) {
    return function(deckId) {
      return function() {
        var title = document.getElementById("deck-title").value;
        var desc = document.getElementById("deck-desc").value;
        var tagsStr = document.getElementById("deck-tags").value;
        var tags = tagsStr.split(",").map(function(t) {
          return t.trim();
        }).filter(function(t) {
          return t !== "";
        });
        var Port = window._portModule;
        if (!Port) return;
        Port.getDeckMeta(deckId)(function(currentMeta) {
          return function() {
            var meta = Object.assign({}, currentMeta, {
              deckId,
              title,
              description: desc,
              tags
            });
            Port.setDeckMeta(deckId)(meta)();
            window.dispatchEvent(new Event("hashchange"));
          };
        })();
      };
    };
  };
  var saveFaceFromJs = function(model) {
    return function(deckId) {
      return function(faceId) {
        return function(value) {
          return function(faceType) {
            return function() {
              var Port = window._portModule;
              if (!Port) return;
              Port.getFaceById(deckId)(faceId)(function(face) {
                return function() {
                  if (!face) return;
                  _updateFaceContent(Port, face, faceId, value, faceType);
                };
              })();
            };
          };
        };
      };
    };
  };
  function _updateFaceContent(Port, face, faceId, value, faceType) {
    var copy = Object.assign({}, face);
    var contents = Object.assign({}, copy.contents || {});
    switch (faceType) {
      case "TextFace":
        contents.text = value;
        contents.type = "TextFace";
        break;
      case "MarkdownFace":
        contents.text = value;
        contents.type = "MarkdownFace";
        break;
      case "ImageFace_src":
        contents.src = value;
        contents.type = "ImageFace";
        break;
      case "ImageFace_alt":
        contents.alt = value;
        contents.type = "ImageFace";
        break;
      case "AudioFace_src":
        contents.src = value;
        contents.type = "AudioFace";
        break;
      case "AudioFace_label":
        contents.label = value;
        contents.type = "AudioFace";
        break;
    }
    copy.contents = contents;
    Port.saveFace(copy)();
  }
  var deleteFaceFromJs = function(model) {
    return function(deckId) {
      return function(faceId) {
        return function() {
          if (!confirm("Delete face?")) return;
          var Port = window._portModule;
          if (!Port) return;
          Port.deleteFace(deckId)(faceId)();
          var el = document.querySelector('[data-face-id="' + faceId + '"]');
          if (el) el.remove();
        };
      };
    };
  };
  var addFaceFromJs = function(model) {
    return function(deckId) {
      return function(faceType) {
        return function(cardId) {
          return function() {
            var Port = window._portModule;
            if (!Port) return;
            var contents;
            switch (faceType) {
              case "text":
                contents = { type: "TextFace", text: "New card", priority: 1, momentum: 1, link_siblings: true };
                break;
              case "markdown":
                contents = { type: "MarkdownFace", text: "**New card**", priority: 1, momentum: 1, link_siblings: true };
                break;
              case "image":
                contents = { type: "ImageFace", src: "", alt: "New image", priority: 1, momentum: 1, link_siblings: true };
                break;
              case "audio":
                contents = { type: "AudioFace", src: "", label: "New audio", priority: 1, momentum: 1, link_siblings: true };
                break;
              default:
                contents = { type: "TextFace", text: "New card", priority: 1, momentum: 1, link_siblings: true };
            }
            var face = {
              deckId,
              cardId,
              contents,
              position: null,
              momentum: 1,
              externalSource: null,
              externalId: null
            };
            Port.saveFace(face)();
            setTimeout(function() {
              window.dispatchEvent(new Event("hashchange"));
            }, 100);
          };
        };
      };
    };
  };
  var newCardFromJs = function(model) {
    return function(deckId) {
      return function() {
        var Port = window._portModule;
        if (!Port) return;
        Port.randomUint32(function(cardId) {
          return function() {
            Port.getDeckFaces(deckId)(function(allFaces) {
              return function() {
                var PRIORITY_MAX = 2147483647;
                var positions = allFaces.filter(function(f) {
                  return f.position !== null && f.position !== void 0;
                }).sort(function(a, b) {
                  return a.position - b.position;
                }).map(function(f) {
                  return f.position;
                });
                var maxPos = positions.length > 0 ? positions[positions.length - 1] : 0;
                var newPos = (maxPos + PRIORITY_MAX) / 2;
                var face = {
                  deckId,
                  cardId,
                  contents: { type: "TextFace", text: "New card", priority: 1, momentum: 1, link_siblings: true },
                  position: newPos,
                  momentum: 1,
                  externalSource: null,
                  externalId: null
                };
                Port.saveFace(face)();
                setTimeout(function() {
                  window.dispatchEvent(new Event("hashchange"));
                }, 100);
              };
            })();
          };
        })();
      };
    };
  };
  var addSourceFromJs = function(model) {
    return function(deckId) {
      return function() {
        var url = document.getElementById("source-url-input").value.trim();
        if (!url) return;
        var Port = window._portModule;
        if (!Port) return;
        var formTitle = document.getElementById("deck-title");
        var formDesc = document.getElementById("deck-desc");
        var formTags = document.getElementById("deck-tags");
        Port.getDeckMeta(deckId)(function(meta) {
          return function() {
            var sources = (meta.sources || []).slice();
            if (sources.indexOf(url) === -1) {
              sources.push(url);
            }
            var updated = Object.assign({}, meta, { deckId, sources });
            if (formTitle) updated.title = formTitle.value;
            if (formDesc) updated.description = formDesc.value;
            if (formTags) updated.tags = formTags.value.split(",").map(function(t) {
              return t.trim();
            }).filter(function(t) {
              return t !== "";
            });
            Port.setDeckMeta(deckId)(updated)();
            try {
              window.dispatchEvent(new Event("hashchange"));
            } catch (e) {
            }
          };
        })();
      };
    };
  };
  var removeSourceFromJs = function(model) {
    return function(deckId) {
      return function(url) {
        return function() {
          var Port = window._portModule;
          if (!Port) return;
          var formTitle = document.getElementById("deck-title");
          var formDesc = document.getElementById("deck-desc");
          var formTags = document.getElementById("deck-tags");
          Port.getDeckMeta(deckId)(function(meta) {
            return function() {
              var sources = (meta.sources || []).filter(function(s) {
                return s !== url;
              });
              var updated = Object.assign({}, meta, { deckId, sources });
              if (formTitle) updated.title = formTitle.value;
              if (formDesc) updated.description = formDesc.value;
              if (formTags) updated.tags = formTags.value.split(",").map(function(t) {
                return t.trim();
              }).filter(function(t) {
                return t !== "";
              });
              Port.setDeckMeta(deckId)(updated)();
              try {
                window.dispatchEvent(new Event("hashchange"));
              } catch (e) {
              }
            };
          })();
        };
      };
    };
  };
  var syncSourcesFromJs = function(model) {
    return function(deckId) {
      return function() {
        var Port = window._portModule;
        if (!Port) return;
        Port.getDeckMeta(deckId)(function(meta) {
          return function() {
            var sources = meta.sources || [];
            if (sources.length === 0) return;
            var total = 0;
            var errors = [];
            var remaining = sources.length;
            sources.forEach(function(url) {
              var csvUrl = window._publishedCsvUrl(url);
              fetch(csvUrl).then(function(r) {
                if (!r.ok) throw new Error("HTTP " + r.status);
                return r.text();
              }).then(function(csvText) {
                return crypto.subtle.digest("SHA-256", new TextEncoder().encode(url)).then(function(buf) {
                  var hex = Array.from(new Uint8Array(buf)).map(function(b) {
                    return b.toString(16).padStart(2, "0");
                  }).join("");
                  var sourceId = hex.substring(0, 16);
                  return { csvText, sourceId };
                });
              }).then(function(r) {
                var count = _importCsvToDeck(Port, deckId, r.csvText, r.sourceId);
                total += count;
                remaining--;
                if (remaining === 0) _finishSync(total, errors);
              }).catch(function(e) {
                errors.push(url + ": " + e.message);
                remaining--;
                if (remaining === 0) _finishSync(total, errors);
              });
            });
          };
        })();
      };
    };
  };
  function _finishSync(total, errors) {
    var msg;
    if (errors.length > 0) {
      msg = "Synced " + total + " card(s) with " + errors.length + " error(s): " + errors.join("; ");
    } else {
      msg = "Synced " + total + " card(s).";
    }
    alert(msg);
    window.dispatchEvent(new Event("hashchange"));
  }
  function _importCsvToDeck(Port, deckId, csvText, sourceId) {
    var lines = csvText.split("\n");
    var PRIORITY_MAX = 2147483647;
    var cards = [];
    for (var i = 0; i < lines.length; i++) {
      var cells = _parseCsvLine(lines[i].trim());
      var faces = [];
      for (var j = 0; j < cells.length; j++) {
        var face = _parseCell(cells[j]);
        if (face) faces.push(face);
      }
      if (faces.length === 0) continue;
      var extIdInput = sourceId + ":" + i;
      var extId = _simpleHash(extIdInput);
      var cardId = Math.random() * 2147483647 | 0;
      cards.push({ cardId, faces, extId });
    }
    var count = cards.length;
    if (count === 0) return 0;
    var step = PRIORITY_MAX / (count + 1);
    for (var ci = 0; ci < cards.length; ci++) {
      var card = cards[ci];
      var position = step * (ci + 1);
      for (var k = 0; k < card.faces.length; k++) {
        var faceRecord = {
          deckId,
          cardId: card.cardId,
          contents: card.faces[k],
          position: k === 0 ? position : null,
          momentum: 1,
          externalSource: sourceId,
          externalId: k === 0 ? card.extId : null
        };
        Port.saveFace(faceRecord)();
      }
    }
    Port.getDeckMeta(deckId)(function(meta) {
      return function() {
        var updated = Object.assign({}, meta, { cardCount: (meta.cardCount || 0) + count });
        Port.setDeckMeta(deckId)(updated)();
      };
    })();
    return count;
  }
  function _simpleHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, "0").substring(0, 16);
  }
  function _parseCsvLine(line) {
    var result = [];
    var current = "";
    var inQuote = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        inQuote = !inQuote;
        continue;
      }
      if (ch === "," && !inQuote) {
        result.push(current);
        current = "";
        continue;
      }
      current += ch;
    }
    result.push(current);
    return result;
  }
  function _parseCell(value) {
    value = value.trim();
    if (!value) return null;
    if (value.startsWith("img:")) {
      return { type: "ImageFace", src: value.substring(4).trim(), alt: "", priority: 1, momentum: 1, link_siblings: true };
    }
    if (value.startsWith("audio:")) {
      return { type: "AudioFace", src: value.substring(6).trim(), label: "", priority: 1, momentum: 1, link_siblings: true };
    }
    if (value.startsWith("md:")) {
      return { type: "MarkdownFace", text: value.substring(3).trim(), priority: 1, momentum: 1, link_siblings: true };
    }
    return { type: "TextFace", text: value, priority: 1, momentum: 1, link_siblings: true };
  }
  var importSheetFromJs = function(model) {
    return function(deckId) {
      return function(meta) {
        return function() {
          var Port = window._portModule;
          if (!Port) return;
          var sheetUrl = document.getElementById("import-sheet-url").value.trim();
          var fileInput = document.getElementById("import-csv-file");
          var file = fileInput && fileInput.files && fileInput.files[0];
          if (sheetUrl) {
            var csvUrl = window._publishedCsvUrl(sheetUrl);
            fetch(csvUrl).then(function(r) {
              if (!r.ok) throw new Error("HTTP " + r.status);
              return r.text();
            }).then(function(csvText) {
              return crypto.subtle.digest("SHA-256", new TextEncoder().encode(sheetUrl)).then(function(buf) {
                var hex = Array.from(new Uint8Array(buf)).map(function(b) {
                  return b.toString(16).padStart(2, "0");
                }).join("");
                return { csvText, sourceId: hex.substring(0, 16) };
              });
            }).then(function(r) {
              var count = _importCsvToDeck(Port, deckId, r.csvText, r.sourceId);
              alert("Imported " + count + " card(s).");
              window.dispatchEvent(new Event("hashchange"));
            }).catch(function(e) {
              alert("Import error: " + e.message);
            });
          } else if (file) {
            var reader = new FileReader();
            reader.onload = function(e) {
              var csvText = e.target.result;
              crypto.subtle.digest("SHA-256", new TextEncoder().encode(file.name)).then(function(buf) {
                var hex = Array.from(new Uint8Array(buf)).map(function(b) {
                  return b.toString(16).padStart(2, "0");
                }).join("");
                var sourceId = hex.substring(0, 16);
                var count = _importCsvToDeck(Port, deckId, csvText, sourceId);
                alert("Imported " + count + " card(s).");
                window.dispatchEvent(new Event("hashchange"));
              });
            };
            reader.readAsText(file);
          } else {
            alert("Please provide a Sheet URL or CSV file.");
          }
        };
      };
    };
  };
  var saveSettingsFromJs = function() {
    var Port = window._portModule;
    if (!Port) return;
    var lr = parseFloat(document.getElementById("learning-rate").value) || 2;
    var dfp = parseFloat(document.getElementById("default-priority").value) || 1;
    var dls = document.getElementById("default-link-siblings").checked;
    Port.saveSettings({
      key: "default",
      learningRate: lr,
      defaultFacePriority: dfp,
      defaultLinkSiblings: dls
    })();
    alert("Settings saved.");
  };
  var restoreBackupFromJs = function(model) {
    return function() {
      var Port = window._portModule;
      if (!Port) return;
      var fileInput = document.getElementById("restore-file");
      if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        alert("No file selected.");
        return;
      }
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var data = JSON.parse(e.target.result);
          if (!data.decks && !data.faces) {
            alert("File does not look like a umemo export.");
            return;
          }
          Port.importAll(data)(function() {
            return function() {
              var deckCount = Object.keys(data.decks || {}).length;
              var faceCount = Object.keys(data.faces || {}).length;
              alert("Imported " + deckCount + " deck(s) and " + faceCount + " face(s).");
              window.location.hash = "#/";
              window.dispatchEvent(new Event("hashchange"));
            };
          })();
        } catch (err) {
          alert("Invalid JSON file: " + err.message);
        }
      };
      reader.readAsText(fileInput.files[0]);
    };
  };
  window._publishedCsvUrl = function(url) {
    if (url.includes("/export?") && url.includes("format=csv")) return url;
    if (url.includes("/pub?") && url.includes("output=csv")) return url;
    var m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (m) {
      var sheetId = m[1];
      var gidMatch = url.match(/gid=(\d+)/);
      var gid = gidMatch ? gidMatch[1] : "0";
      return "https://docs.google.com/spreadsheets/d/" + sheetId + "/export?format=csv&gid=" + gid;
    }
    return url;
  };
  var startBackgroundSync = function(model) {
    return function() {
      var DS = window._driveSyncModule;
      if (!DS) return;
      window._startBgPush = function() {
        _doPushOnly(DS);
      };
      window._startBgSync = function() {
        startBackgroundSync(model)();
      };
      if (window._syncRunning) return;
      window._syncRunning = true;
      if (window._setSyncState) window._setSyncState("syncing");
      var indicator = document.getElementById("sync-indicator");
      if (indicator) indicator.textContent = "\u{1F504} Syncing\u2026";
      DS.fullSync(function() {
        return function() {
          window._syncRunning = false;
          if (window._setSyncState) window._setSyncState("done");
          var el = document.getElementById("sync-indicator");
          if (el) el.textContent = "\u2713 Synced";
          if (!window.location.hash || window.location.hash === "#/" || window.location.hash === "#") {
            window.dispatchEvent(new Event("hashchange"));
          }
          setTimeout(function() {
            if (window._setSyncState && window._syncState.status === "done")
              window._setSyncState("idle");
            var el2 = document.getElementById("sync-indicator");
            if (el2 && el2.textContent === "\u2713 Synced") el2.textContent = "";
          }, 3e3);
        };
      })(function(err) {
        return function() {
          window._syncRunning = false;
          if (window._setSyncState) window._setSyncState("error", err);
          window._lastSyncError = err;
          var el = document.getElementById("sync-indicator");
          if (el) el.textContent = "\u26A0 Sync failed";
          setTimeout(function() {
            if (window._setSyncState && window._syncState.status === "error")
              window._setSyncState("idle");
            var el2 = document.getElementById("sync-indicator");
            if (el2 && el2.textContent === "\u26A0 Sync failed") el2.textContent = "";
          }, 5e3);
        };
      })();
    };
  };
  function _doPushOnly(DS) {
    if (window._syncRunning) return;
    window._syncRunning = true;
    if (window._setSyncState) window._setSyncState("syncing");
    DS.pushSync(function() {
      return function() {
        window._syncRunning = false;
        if (window._setSyncState) window._setSyncState("done");
        setTimeout(function() {
          if (window._setSyncState && window._syncState.status === "done")
            window._setSyncState("idle");
        }, 3e3);
      };
    })(function() {
      return function() {
        window._syncRunning = false;
        if (window._setSyncState) window._setSyncState("error");
        setTimeout(function() {
          if (window._setSyncState && window._syncState.status === "error")
            window._setSyncState("idle");
        }, 5e3);
      };
    })();
  }

  // output/Control.Apply/foreign.js
  var arrayApply = function(fs) {
    return function(xs) {
      var l = fs.length;
      var k = xs.length;
      var result = new Array(l * k);
      var n = 0;
      for (var i = 0; i < l; i++) {
        var f = fs[i];
        for (var j = 0; j < k; j++) {
          result[n++] = f(xs[j]);
        }
      }
      return result;
    };
  };

  // output/Control.Semigroupoid/index.js
  var semigroupoidFn = {
    compose: function(f) {
      return function(g) {
        return function(x) {
          return f(g(x));
        };
      };
    }
  };

  // output/Control.Category/index.js
  var identity = function(dict) {
    return dict.identity;
  };
  var categoryFn = {
    identity: function(x) {
      return x;
    },
    Semigroupoid0: function() {
      return semigroupoidFn;
    }
  };

  // output/Data.Function/index.js
  var flip = function(f) {
    return function(b) {
      return function(a) {
        return f(a)(b);
      };
    };
  };
  var $$const = function(a) {
    return function(v) {
      return a;
    };
  };
  var applyFlipped = function(x) {
    return function(f) {
      return f(x);
    };
  };

  // output/Data.Functor/foreign.js
  var arrayMap = function(f) {
    return function(arr) {
      var l = arr.length;
      var result = new Array(l);
      for (var i = 0; i < l; i++) {
        result[i] = f(arr[i]);
      }
      return result;
    };
  };

  // output/Data.Unit/foreign.js
  var unit = void 0;

  // output/Data.Functor/index.js
  var map = function(dict) {
    return dict.map;
  };
  var functorArray = {
    map: arrayMap
  };

  // output/Control.Apply/index.js
  var applyArray = {
    apply: arrayApply,
    Functor0: function() {
      return functorArray;
    }
  };
  var apply = function(dict) {
    return dict.apply;
  };

  // output/Control.Applicative/index.js
  var pure = function(dict) {
    return dict.pure;
  };
  var liftA1 = function(dictApplicative) {
    var apply2 = apply(dictApplicative.Apply0());
    var pure12 = pure(dictApplicative);
    return function(f) {
      return function(a) {
        return apply2(pure12(f))(a);
      };
    };
  };

  // output/Control.Bind/foreign.js
  var arrayBind = typeof Array.prototype.flatMap === "function" ? function(arr) {
    return function(f) {
      return arr.flatMap(f);
    };
  } : function(arr) {
    return function(f) {
      var result = [];
      var l = arr.length;
      for (var i = 0; i < l; i++) {
        var xs = f(arr[i]);
        var k = xs.length;
        for (var j = 0; j < k; j++) {
          result.push(xs[j]);
        }
      }
      return result;
    };
  };

  // output/Control.Bind/index.js
  var bindArray = {
    bind: arrayBind,
    Apply0: function() {
      return applyArray;
    }
  };
  var bind = function(dict) {
    return dict.bind;
  };
  var bindFlipped = function(dictBind) {
    return flip(bind(dictBind));
  };
  var composeKleisliFlipped = function(dictBind) {
    var bindFlipped1 = bindFlipped(dictBind);
    return function(f) {
      return function(g) {
        return function(a) {
          return bindFlipped1(f)(g(a));
        };
      };
    };
  };

  // output/Data.Argonaut.Core/foreign.js
  function stringify(j) {
    return JSON.stringify(j);
  }
  function _caseJson(isNull2, isBool, isNum, isStr, isArr, isObj, j) {
    if (j == null) return isNull2();
    else if (typeof j === "boolean") return isBool(j);
    else if (typeof j === "number") return isNum(j);
    else if (typeof j === "string") return isStr(j);
    else if (Object.prototype.toString.call(j) === "[object Array]")
      return isArr(j);
    else return isObj(j);
  }

  // output/Data.Eq/foreign.js
  var refEq = function(r1) {
    return function(r2) {
      return r1 === r2;
    };
  };
  var eqCharImpl = refEq;

  // output/Data.Eq/index.js
  var eqChar = {
    eq: eqCharImpl
  };

  // output/Data.Semigroup/index.js
  var append = function(dict) {
    return dict.append;
  };

  // output/Data.Bounded/foreign.js
  var topChar = String.fromCharCode(65535);
  var bottomChar = String.fromCharCode(0);
  var topNumber = Number.POSITIVE_INFINITY;
  var bottomNumber = Number.NEGATIVE_INFINITY;

  // output/Data.Ord/foreign.js
  var unsafeCompareImpl = function(lt) {
    return function(eq2) {
      return function(gt) {
        return function(x) {
          return function(y) {
            return x < y ? lt : x === y ? eq2 : gt;
          };
        };
      };
    };
  };
  var ordCharImpl = unsafeCompareImpl;

  // output/Data.Ordering/index.js
  var LT = /* @__PURE__ */ (function() {
    function LT2() {
    }
    ;
    LT2.value = new LT2();
    return LT2;
  })();
  var GT = /* @__PURE__ */ (function() {
    function GT2() {
    }
    ;
    GT2.value = new GT2();
    return GT2;
  })();
  var EQ = /* @__PURE__ */ (function() {
    function EQ2() {
    }
    ;
    EQ2.value = new EQ2();
    return EQ2;
  })();

  // output/Data.Ring/foreign.js
  var intSub = function(x) {
    return function(y) {
      return x - y | 0;
    };
  };

  // output/Data.Semiring/foreign.js
  var intAdd = function(x) {
    return function(y) {
      return x + y | 0;
    };
  };
  var intMul = function(x) {
    return function(y) {
      return x * y | 0;
    };
  };

  // output/Data.Semiring/index.js
  var semiringInt = {
    add: intAdd,
    zero: 0,
    mul: intMul,
    one: 1
  };

  // output/Data.Ring/index.js
  var ringInt = {
    sub: intSub,
    Semiring0: function() {
      return semiringInt;
    }
  };

  // output/Data.Ord/index.js
  var ordChar = /* @__PURE__ */ (function() {
    return {
      compare: ordCharImpl(LT.value)(EQ.value)(GT.value),
      Eq0: function() {
        return eqChar;
      }
    };
  })();

  // output/Data.Bounded/index.js
  var top = function(dict) {
    return dict.top;
  };
  var boundedChar = {
    top: topChar,
    bottom: bottomChar,
    Ord0: function() {
      return ordChar;
    }
  };
  var bottom = function(dict) {
    return dict.bottom;
  };

  // output/Data.Show/foreign.js
  var showIntImpl = function(n) {
    return n.toString();
  };
  var showNumberImpl = function(n) {
    var str = n.toString();
    return isNaN(str + ".0") ? str : str + ".0";
  };

  // output/Data.Show/index.js
  var showNumber = {
    show: showNumberImpl
  };
  var showInt = {
    show: showIntImpl
  };
  var showBoolean = {
    show: function(v) {
      if (v) {
        return "true";
      }
      ;
      if (!v) {
        return "false";
      }
      ;
      throw new Error("Failed pattern match at Data.Show (line 29, column 1 - line 31, column 23): " + [v.constructor.name]);
    }
  };
  var show = function(dict) {
    return dict.show;
  };

  // output/Data.Maybe/index.js
  var identity2 = /* @__PURE__ */ identity(categoryFn);
  var Nothing = /* @__PURE__ */ (function() {
    function Nothing2() {
    }
    ;
    Nothing2.value = new Nothing2();
    return Nothing2;
  })();
  var Just = /* @__PURE__ */ (function() {
    function Just2(value0) {
      this.value0 = value0;
    }
    ;
    Just2.create = function(value0) {
      return new Just2(value0);
    };
    return Just2;
  })();
  var maybe = function(v) {
    return function(v1) {
      return function(v2) {
        if (v2 instanceof Nothing) {
          return v;
        }
        ;
        if (v2 instanceof Just) {
          return v1(v2.value0);
        }
        ;
        throw new Error("Failed pattern match at Data.Maybe (line 237, column 1 - line 237, column 51): " + [v.constructor.name, v1.constructor.name, v2.constructor.name]);
      };
    };
  };
  var isNothing = /* @__PURE__ */ maybe(true)(/* @__PURE__ */ $$const(false));
  var functorMaybe = {
    map: function(v) {
      return function(v1) {
        if (v1 instanceof Just) {
          return new Just(v(v1.value0));
        }
        ;
        return Nothing.value;
      };
    }
  };
  var fromMaybe = function(a) {
    return maybe(a)(identity2);
  };
  var fromJust = function() {
    return function(v) {
      if (v instanceof Just) {
        return v.value0;
      }
      ;
      throw new Error("Failed pattern match at Data.Maybe (line 288, column 1 - line 288, column 46): " + [v.constructor.name]);
    };
  };

  // output/Foreign.Object/foreign.js
  function _copyST(m) {
    return function() {
      var r = {};
      for (var k in m) {
        if (hasOwnProperty.call(m, k)) {
          r[k] = m[k];
        }
      }
      return r;
    };
  }
  var empty = {};
  function runST(f) {
    return f();
  }
  function _fmapObject(m0, f) {
    var m = {};
    for (var k in m0) {
      if (hasOwnProperty.call(m0, k)) {
        m[k] = f(m0[k]);
      }
    }
    return m;
  }
  function _mapWithKey(m0, f) {
    var m = {};
    for (var k in m0) {
      if (hasOwnProperty.call(m0, k)) {
        m[k] = f(k)(m0[k]);
      }
    }
    return m;
  }
  function _foldM(bind3) {
    return function(f) {
      return function(mz) {
        return function(m) {
          var acc = mz;
          function g(k2) {
            return function(z) {
              return f(z)(k2)(m[k2]);
            };
          }
          for (var k in m) {
            if (hasOwnProperty.call(m, k)) {
              acc = bind3(acc)(g(k));
            }
          }
          return acc;
        };
      };
    };
  }
  function _lookup(no, yes, k, m) {
    return k in m ? yes(m[k]) : no;
  }
  function toArrayWithKey(f) {
    return function(m) {
      var r = [];
      for (var k in m) {
        if (hasOwnProperty.call(m, k)) {
          r.push(f(k)(m[k]));
        }
      }
      return r;
    };
  }
  var keys = Object.keys || toArrayWithKey(function(k) {
    return function() {
      return k;
    };
  });

  // output/Control.Monad/index.js
  var ap = function(dictMonad) {
    var bind3 = bind(dictMonad.Bind1());
    var pure5 = pure(dictMonad.Applicative0());
    return function(f) {
      return function(a) {
        return bind3(f)(function(f$prime) {
          return bind3(a)(function(a$prime) {
            return pure5(f$prime(a$prime));
          });
        });
      };
    };
  };

  // output/Data.Either/index.js
  var Left = /* @__PURE__ */ (function() {
    function Left2(value0) {
      this.value0 = value0;
    }
    ;
    Left2.create = function(value0) {
      return new Left2(value0);
    };
    return Left2;
  })();
  var Right = /* @__PURE__ */ (function() {
    function Right2(value0) {
      this.value0 = value0;
    }
    ;
    Right2.create = function(value0) {
      return new Right2(value0);
    };
    return Right2;
  })();
  var note = function(a) {
    return maybe(new Left(a))(Right.create);
  };
  var functorEither = {
    map: function(f) {
      return function(m) {
        if (m instanceof Left) {
          return new Left(m.value0);
        }
        ;
        if (m instanceof Right) {
          return new Right(f(m.value0));
        }
        ;
        throw new Error("Failed pattern match at Data.Either (line 0, column 0 - line 0, column 0): " + [m.constructor.name]);
      };
    }
  };
  var map2 = /* @__PURE__ */ map(functorEither);
  var either = function(v) {
    return function(v1) {
      return function(v2) {
        if (v2 instanceof Left) {
          return v(v2.value0);
        }
        ;
        if (v2 instanceof Right) {
          return v1(v2.value0);
        }
        ;
        throw new Error("Failed pattern match at Data.Either (line 208, column 1 - line 208, column 64): " + [v.constructor.name, v1.constructor.name, v2.constructor.name]);
      };
    };
  };
  var applyEither = {
    apply: function(v) {
      return function(v1) {
        if (v instanceof Left) {
          return new Left(v.value0);
        }
        ;
        if (v instanceof Right) {
          return map2(v.value0)(v1);
        }
        ;
        throw new Error("Failed pattern match at Data.Either (line 70, column 1 - line 72, column 30): " + [v.constructor.name, v1.constructor.name]);
      };
    },
    Functor0: function() {
      return functorEither;
    }
  };
  var bindEither = {
    bind: /* @__PURE__ */ either(function(e) {
      return function(v) {
        return new Left(e);
      };
    })(function(a) {
      return function(f) {
        return f(a);
      };
    }),
    Apply0: function() {
      return applyEither;
    }
  };
  var applicativeEither = /* @__PURE__ */ (function() {
    return {
      pure: Right.create,
      Apply0: function() {
        return applyEither;
      }
    };
  })();

  // output/Data.EuclideanRing/foreign.js
  var intDegree = function(x) {
    return Math.min(Math.abs(x), 2147483647);
  };
  var intDiv = function(x) {
    return function(y) {
      if (y === 0) return 0;
      return y > 0 ? Math.floor(x / y) : -Math.floor(x / -y);
    };
  };
  var intMod = function(x) {
    return function(y) {
      if (y === 0) return 0;
      var yy = Math.abs(y);
      return (x % yy + yy) % yy;
    };
  };

  // output/Data.CommutativeRing/index.js
  var commutativeRingInt = {
    Ring0: function() {
      return ringInt;
    }
  };

  // output/Data.EuclideanRing/index.js
  var mod = function(dict) {
    return dict.mod;
  };
  var euclideanRingInt = {
    degree: intDegree,
    div: intDiv,
    mod: intMod,
    CommutativeRing0: function() {
      return commutativeRingInt;
    }
  };
  var div = function(dict) {
    return dict.div;
  };

  // output/Data.Monoid/index.js
  var mempty = function(dict) {
    return dict.mempty;
  };

  // output/Effect/foreign.js
  var pureE = function(a) {
    return function() {
      return a;
    };
  };
  var bindE = function(a) {
    return function(f) {
      return function() {
        return f(a())();
      };
    };
  };

  // output/Effect/index.js
  var $runtime_lazy = function(name, moduleName, init3) {
    var state = 0;
    var val;
    return function(lineNumber) {
      if (state === 2) return val;
      if (state === 1) throw new ReferenceError(name + " was needed before it finished initializing (module " + moduleName + ", line " + lineNumber + ")", moduleName, lineNumber);
      state = 1;
      val = init3();
      state = 2;
      return val;
    };
  };
  var monadEffect = {
    Applicative0: function() {
      return applicativeEffect;
    },
    Bind1: function() {
      return bindEffect;
    }
  };
  var bindEffect = {
    bind: bindE,
    Apply0: function() {
      return $lazy_applyEffect(0);
    }
  };
  var applicativeEffect = {
    pure: pureE,
    Apply0: function() {
      return $lazy_applyEffect(0);
    }
  };
  var $lazy_functorEffect = /* @__PURE__ */ $runtime_lazy("functorEffect", "Effect", function() {
    return {
      map: liftA1(applicativeEffect)
    };
  });
  var $lazy_applyEffect = /* @__PURE__ */ $runtime_lazy("applyEffect", "Effect", function() {
    return {
      apply: ap(monadEffect),
      Functor0: function() {
        return $lazy_functorEffect(0);
      }
    };
  });

  // output/Data.Array/foreign.js
  var replicateFill = function(count, value) {
    if (count < 1) {
      return [];
    }
    var result = new Array(count);
    return result.fill(value);
  };
  var replicatePolyfill = function(count, value) {
    var result = [];
    var n = 0;
    for (var i = 0; i < count; i++) {
      result[n++] = value;
    }
    return result;
  };
  var replicateImpl = typeof Array.prototype.fill === "function" ? replicateFill : replicatePolyfill;
  var length = function(xs) {
    return xs.length;
  };
  var indexImpl = function(just, nothing, xs, i) {
    return i < 0 || i >= xs.length ? nothing : just(xs[i]);
  };
  var filterImpl = function(f, xs) {
    return xs.filter(f);
  };

  // output/Data.Foldable/foreign.js
  var foldrArray = function(f) {
    return function(init3) {
      return function(xs) {
        var acc = init3;
        var len = xs.length;
        for (var i = len - 1; i >= 0; i--) {
          acc = f(xs[i])(acc);
        }
        return acc;
      };
    };
  };
  var foldlArray = function(f) {
    return function(init3) {
      return function(xs) {
        var acc = init3;
        var len = xs.length;
        for (var i = 0; i < len; i++) {
          acc = f(acc)(xs[i]);
        }
        return acc;
      };
    };
  };

  // output/Data.Tuple/index.js
  var Tuple = /* @__PURE__ */ (function() {
    function Tuple2(value0, value1) {
      this.value0 = value0;
      this.value1 = value1;
    }
    ;
    Tuple2.create = function(value0) {
      return function(value1) {
        return new Tuple2(value0, value1);
      };
    };
    return Tuple2;
  })();
  var uncurry = function(f) {
    return function(v) {
      return f(v.value0)(v.value1);
    };
  };
  var snd = function(v) {
    return v.value1;
  };
  var fst = function(v) {
    return v.value0;
  };

  // output/Data.Bifunctor/index.js
  var identity3 = /* @__PURE__ */ identity(categoryFn);
  var bimap = function(dict) {
    return dict.bimap;
  };
  var lmap = function(dictBifunctor) {
    var bimap1 = bimap(dictBifunctor);
    return function(f) {
      return bimap1(f)(identity3);
    };
  };
  var bifunctorEither = {
    bimap: function(v) {
      return function(v1) {
        return function(v2) {
          if (v2 instanceof Left) {
            return new Left(v(v2.value0));
          }
          ;
          if (v2 instanceof Right) {
            return new Right(v1(v2.value0));
          }
          ;
          throw new Error("Failed pattern match at Data.Bifunctor (line 38, column 1 - line 40, column 36): " + [v.constructor.name, v1.constructor.name, v2.constructor.name]);
        };
      };
    }
  };

  // output/Data.Foldable/index.js
  var foldr = function(dict) {
    return dict.foldr;
  };
  var foldl = function(dict) {
    return dict.foldl;
  };
  var foldMapDefaultR = function(dictFoldable) {
    var foldr22 = foldr(dictFoldable);
    return function(dictMonoid) {
      var append2 = append(dictMonoid.Semigroup0());
      var mempty2 = mempty(dictMonoid);
      return function(f) {
        return foldr22(function(x) {
          return function(acc) {
            return append2(f(x))(acc);
          };
        })(mempty2);
      };
    };
  };
  var foldableArray = {
    foldr: foldrArray,
    foldl: foldlArray,
    foldMap: function(dictMonoid) {
      return foldMapDefaultR(foldableArray)(dictMonoid);
    }
  };

  // output/Data.Function.Uncurried/foreign.js
  var runFn2 = function(fn) {
    return function(a) {
      return function(b) {
        return fn(a, b);
      };
    };
  };
  var runFn4 = function(fn) {
    return function(a) {
      return function(b) {
        return function(c) {
          return function(d) {
            return fn(a, b, c, d);
          };
        };
      };
    };
  };

  // output/Data.FunctorWithIndex/foreign.js
  var mapWithIndexArray = function(f) {
    return function(xs) {
      var l = xs.length;
      var result = Array(l);
      for (var i = 0; i < l; i++) {
        result[i] = f(i)(xs[i]);
      }
      return result;
    };
  };

  // output/Data.FunctorWithIndex/index.js
  var mapWithIndex = function(dict) {
    return dict.mapWithIndex;
  };
  var functorWithIndexArray = {
    mapWithIndex: mapWithIndexArray,
    Functor0: function() {
      return functorArray;
    }
  };

  // output/Data.Traversable/foreign.js
  var traverseArrayImpl = /* @__PURE__ */ (function() {
    function array1(a) {
      return [a];
    }
    function array2(a) {
      return function(b) {
        return [a, b];
      };
    }
    function array3(a) {
      return function(b) {
        return function(c) {
          return [a, b, c];
        };
      };
    }
    function concat2(xs) {
      return function(ys) {
        return xs.concat(ys);
      };
    }
    return function(apply2) {
      return function(map7) {
        return function(pure5) {
          return function(f) {
            return function(array) {
              function go(bot, top2) {
                switch (top2 - bot) {
                  case 0:
                    return pure5([]);
                  case 1:
                    return map7(array1)(f(array[bot]));
                  case 2:
                    return apply2(map7(array2)(f(array[bot])))(f(array[bot + 1]));
                  case 3:
                    return apply2(apply2(map7(array3)(f(array[bot])))(f(array[bot + 1])))(f(array[bot + 2]));
                  default:
                    var pivot = bot + Math.floor((top2 - bot) / 4) * 2;
                    return apply2(map7(concat2)(go(bot, pivot)))(go(pivot, top2));
                }
              }
              return go(0, array.length);
            };
          };
        };
      };
    };
  })();

  // output/Data.Traversable/index.js
  var identity4 = /* @__PURE__ */ identity(categoryFn);
  var traverse = function(dict) {
    return dict.traverse;
  };
  var sequenceDefault = function(dictTraversable) {
    var traverse2 = traverse(dictTraversable);
    return function(dictApplicative) {
      return traverse2(dictApplicative)(identity4);
    };
  };
  var traversableArray = {
    traverse: function(dictApplicative) {
      var Apply0 = dictApplicative.Apply0();
      return traverseArrayImpl(apply(Apply0))(map(Apply0.Functor0()))(pure(dictApplicative));
    },
    sequence: function(dictApplicative) {
      return sequenceDefault(traversableArray)(dictApplicative);
    },
    Functor0: function() {
      return functorArray;
    },
    Foldable1: function() {
      return foldableArray;
    }
  };
  var sequence = function(dict) {
    return dict.sequence;
  };

  // output/Data.Unfoldable/foreign.js
  var unfoldrArrayImpl = function(isNothing2) {
    return function(fromJust4) {
      return function(fst2) {
        return function(snd2) {
          return function(f) {
            return function(b) {
              var result = [];
              var value = b;
              while (true) {
                var maybe2 = f(value);
                if (isNothing2(maybe2)) return result;
                var tuple = fromJust4(maybe2);
                result.push(fst2(tuple));
                value = snd2(tuple);
              }
            };
          };
        };
      };
    };
  };

  // output/Data.Unfoldable1/foreign.js
  var unfoldr1ArrayImpl = function(isNothing2) {
    return function(fromJust4) {
      return function(fst2) {
        return function(snd2) {
          return function(f) {
            return function(b) {
              var result = [];
              var value = b;
              while (true) {
                var tuple = f(value);
                result.push(fst2(tuple));
                var maybe2 = snd2(tuple);
                if (isNothing2(maybe2)) return result;
                value = fromJust4(maybe2);
              }
            };
          };
        };
      };
    };
  };

  // output/Data.Unfoldable1/index.js
  var fromJust2 = /* @__PURE__ */ fromJust();
  var unfoldable1Array = {
    unfoldr1: /* @__PURE__ */ unfoldr1ArrayImpl(isNothing)(fromJust2)(fst)(snd)
  };

  // output/Data.Unfoldable/index.js
  var fromJust3 = /* @__PURE__ */ fromJust();
  var unfoldr = function(dict) {
    return dict.unfoldr;
  };
  var unfoldableArray = {
    unfoldr: /* @__PURE__ */ unfoldrArrayImpl(isNothing)(fromJust3)(fst)(snd),
    Unfoldable10: function() {
      return unfoldable1Array;
    }
  };

  // output/Data.Array/index.js
  var $$null = function(xs) {
    return length(xs) === 0;
  };
  var index = /* @__PURE__ */ (function() {
    return runFn4(indexImpl)(Just.create)(Nothing.value);
  })();
  var head = function(xs) {
    return index(xs)(0);
  };
  var filter = /* @__PURE__ */ runFn2(filterImpl);
  var concatMap = /* @__PURE__ */ flip(/* @__PURE__ */ bind(bindArray));

  // output/Data.FoldableWithIndex/index.js
  var foldr8 = /* @__PURE__ */ foldr(foldableArray);
  var mapWithIndex2 = /* @__PURE__ */ mapWithIndex(functorWithIndexArray);
  var foldl8 = /* @__PURE__ */ foldl(foldableArray);
  var foldrWithIndex = function(dict) {
    return dict.foldrWithIndex;
  };
  var foldMapWithIndexDefaultR = function(dictFoldableWithIndex) {
    var foldrWithIndex1 = foldrWithIndex(dictFoldableWithIndex);
    return function(dictMonoid) {
      var append2 = append(dictMonoid.Semigroup0());
      var mempty2 = mempty(dictMonoid);
      return function(f) {
        return foldrWithIndex1(function(i) {
          return function(x) {
            return function(acc) {
              return append2(f(i)(x))(acc);
            };
          };
        })(mempty2);
      };
    };
  };
  var foldableWithIndexArray = {
    foldrWithIndex: function(f) {
      return function(z) {
        var $291 = foldr8(function(v) {
          return function(y) {
            return f(v.value0)(v.value1)(y);
          };
        })(z);
        var $292 = mapWithIndex2(Tuple.create);
        return function($293) {
          return $291($292($293));
        };
      };
    },
    foldlWithIndex: function(f) {
      return function(z) {
        var $294 = foldl8(function(y) {
          return function(v) {
            return f(v.value0)(y)(v.value1);
          };
        })(z);
        var $295 = mapWithIndex2(Tuple.create);
        return function($296) {
          return $294($295($296));
        };
      };
    },
    foldMapWithIndex: function(dictMonoid) {
      return foldMapWithIndexDefaultR(foldableWithIndexArray)(dictMonoid);
    },
    Foldable0: function() {
      return foldableArray;
    }
  };

  // output/Data.TraversableWithIndex/index.js
  var traverseWithIndexDefault = function(dictTraversableWithIndex) {
    var sequence2 = sequence(dictTraversableWithIndex.Traversable2());
    var mapWithIndex4 = mapWithIndex(dictTraversableWithIndex.FunctorWithIndex0());
    return function(dictApplicative) {
      var sequence12 = sequence2(dictApplicative);
      return function(f) {
        var $174 = mapWithIndex4(f);
        return function($175) {
          return sequence12($174($175));
        };
      };
    };
  };
  var traverseWithIndex = function(dict) {
    return dict.traverseWithIndex;
  };
  var traversableWithIndexArray = {
    traverseWithIndex: function(dictApplicative) {
      return traverseWithIndexDefault(traversableWithIndexArray)(dictApplicative);
    },
    FunctorWithIndex0: function() {
      return functorWithIndexArray;
    },
    FoldableWithIndex1: function() {
      return foldableWithIndexArray;
    },
    Traversable2: function() {
      return traversableArray;
    }
  };

  // output/Foreign.Object.ST/foreign.js
  function poke2(k) {
    return function(v) {
      return function(m) {
        return function() {
          m[k] = v;
          return m;
        };
      };
    };
  }

  // output/Foreign.Object/index.js
  var foldr2 = /* @__PURE__ */ foldr(foldableArray);
  var identity5 = /* @__PURE__ */ identity(categoryFn);
  var values = /* @__PURE__ */ toArrayWithKey(function(v) {
    return function(v1) {
      return v1;
    };
  });
  var thawST = _copyST;
  var mutate = function(f) {
    return function(m) {
      return runST(function __do3() {
        var s = thawST(m)();
        f(s)();
        return s;
      });
    };
  };
  var mapWithKey = function(f) {
    return function(m) {
      return _mapWithKey(m, f);
    };
  };
  var lookup = /* @__PURE__ */ (function() {
    return runFn4(_lookup)(Nothing.value)(Just.create);
  })();
  var insert = function(k) {
    return function(v) {
      return mutate(poke2(k)(v));
    };
  };
  var functorObject = {
    map: function(f) {
      return function(m) {
        return _fmapObject(m, f);
      };
    }
  };
  var functorWithIndexObject = {
    mapWithIndex: mapWithKey,
    Functor0: function() {
      return functorObject;
    }
  };
  var fold2 = /* @__PURE__ */ _foldM(applyFlipped);
  var foldMap2 = function(dictMonoid) {
    var append1 = append(dictMonoid.Semigroup0());
    var mempty2 = mempty(dictMonoid);
    return function(f) {
      return fold2(function(acc) {
        return function(k) {
          return function(v) {
            return append1(acc)(f(k)(v));
          };
        };
      })(mempty2);
    };
  };
  var foldableObject = {
    foldl: function(f) {
      return fold2(function(z) {
        return function(v) {
          return f(z);
        };
      });
    },
    foldr: function(f) {
      return function(z) {
        return function(m) {
          return foldr2(f)(z)(values(m));
        };
      };
    },
    foldMap: function(dictMonoid) {
      var foldMap12 = foldMap2(dictMonoid);
      return function(f) {
        return foldMap12($$const(f));
      };
    }
  };
  var foldableWithIndexObject = {
    foldlWithIndex: function(f) {
      return fold2(flip(f));
    },
    foldrWithIndex: function(f) {
      return function(z) {
        return function(m) {
          return foldr2(uncurry(f))(z)(toArrayWithKey(Tuple.create)(m));
        };
      };
    },
    foldMapWithIndex: function(dictMonoid) {
      return foldMap2(dictMonoid);
    },
    Foldable0: function() {
      return foldableObject;
    }
  };
  var traversableWithIndexObject = {
    traverseWithIndex: function(dictApplicative) {
      var Apply0 = dictApplicative.Apply0();
      var apply2 = apply(Apply0);
      var map7 = map(Apply0.Functor0());
      var pure12 = pure(dictApplicative);
      return function(f) {
        return function(ms) {
          return fold2(function(acc) {
            return function(k) {
              return function(v) {
                return apply2(map7(flip(insert(k)))(acc))(f(k)(v));
              };
            };
          })(pure12(empty))(ms);
        };
      };
    },
    FunctorWithIndex0: function() {
      return functorWithIndexObject;
    },
    FoldableWithIndex1: function() {
      return foldableWithIndexObject;
    },
    Traversable2: function() {
      return traversableObject;
    }
  };
  var traversableObject = {
    traverse: function(dictApplicative) {
      var $96 = traverseWithIndex(traversableWithIndexObject)(dictApplicative);
      return function($97) {
        return $96($$const($97));
      };
    },
    sequence: function(dictApplicative) {
      return traverse(traversableObject)(dictApplicative)(identity5);
    },
    Functor0: function() {
      return functorObject;
    },
    Foldable1: function() {
      return foldableObject;
    }
  };

  // output/Data.Argonaut.Core/index.js
  var verbJsonType = function(def) {
    return function(f) {
      return function(g) {
        return g(def)(f);
      };
    };
  };
  var toJsonType = /* @__PURE__ */ (function() {
    return verbJsonType(Nothing.value)(Just.create);
  })();
  var isJsonType = /* @__PURE__ */ verbJsonType(false)(/* @__PURE__ */ $$const(true));
  var caseJsonString = function(d) {
    return function(f) {
      return function(j) {
        return _caseJson($$const(d), $$const(d), $$const(d), f, $$const(d), $$const(d), j);
      };
    };
  };
  var caseJsonObject = function(d) {
    return function(f) {
      return function(j) {
        return _caseJson($$const(d), $$const(d), $$const(d), $$const(d), $$const(d), f, j);
      };
    };
  };
  var toObject = /* @__PURE__ */ toJsonType(caseJsonObject);
  var caseJsonNumber = function(d) {
    return function(f) {
      return function(j) {
        return _caseJson($$const(d), $$const(d), f, $$const(d), $$const(d), $$const(d), j);
      };
    };
  };
  var caseJsonNull = function(d) {
    return function(f) {
      return function(j) {
        return _caseJson(f, $$const(d), $$const(d), $$const(d), $$const(d), $$const(d), j);
      };
    };
  };
  var isNull = /* @__PURE__ */ isJsonType(caseJsonNull);
  var caseJsonBoolean = function(d) {
    return function(f) {
      return function(j) {
        return _caseJson($$const(d), f, $$const(d), $$const(d), $$const(d), $$const(d), j);
      };
    };
  };
  var caseJsonArray = function(d) {
    return function(f) {
      return function(j) {
        return _caseJson($$const(d), $$const(d), $$const(d), $$const(d), f, $$const(d), j);
      };
    };
  };
  var toArray = /* @__PURE__ */ toJsonType(caseJsonArray);

  // output/Data.Argonaut.Decode.Error/index.js
  var TypeMismatch = /* @__PURE__ */ (function() {
    function TypeMismatch2(value0) {
      this.value0 = value0;
    }
    ;
    TypeMismatch2.create = function(value0) {
      return new TypeMismatch2(value0);
    };
    return TypeMismatch2;
  })();
  var AtIndex = /* @__PURE__ */ (function() {
    function AtIndex2(value0, value1) {
      this.value0 = value0;
      this.value1 = value1;
    }
    ;
    AtIndex2.create = function(value0) {
      return function(value1) {
        return new AtIndex2(value0, value1);
      };
    };
    return AtIndex2;
  })();
  var AtKey = /* @__PURE__ */ (function() {
    function AtKey2(value0, value1) {
      this.value0 = value0;
      this.value1 = value1;
    }
    ;
    AtKey2.create = function(value0) {
      return function(value1) {
        return new AtKey2(value0, value1);
      };
    };
    return AtKey2;
  })();
  var Named = /* @__PURE__ */ (function() {
    function Named2(value0, value1) {
      this.value0 = value0;
      this.value1 = value1;
    }
    ;
    Named2.create = function(value0) {
      return function(value1) {
        return new Named2(value0, value1);
      };
    };
    return Named2;
  })();
  var MissingValue = /* @__PURE__ */ (function() {
    function MissingValue2() {
    }
    ;
    MissingValue2.value = new MissingValue2();
    return MissingValue2;
  })();

  // output/Data.Int/foreign.js
  var fromNumberImpl = function(just) {
    return function(nothing) {
      return function(n) {
        return (n | 0) === n ? just(n) : nothing;
      };
    };
  };

  // output/Data.Int/index.js
  var fromNumber = /* @__PURE__ */ (function() {
    return fromNumberImpl(Just.create)(Nothing.value);
  })();

  // output/Data.String.CodePoints/foreign.js
  var hasArrayFrom = typeof Array.from === "function";
  var hasStringIterator = typeof Symbol !== "undefined" && Symbol != null && typeof Symbol.iterator !== "undefined" && typeof String.prototype[Symbol.iterator] === "function";
  var hasFromCodePoint = typeof String.prototype.fromCodePoint === "function";
  var hasCodePointAt = typeof String.prototype.codePointAt === "function";
  var _unsafeCodePointAt0 = function(fallback) {
    return hasCodePointAt ? function(str) {
      return str.codePointAt(0);
    } : fallback;
  };
  var _singleton = function(fallback) {
    return hasFromCodePoint ? String.fromCodePoint : fallback;
  };
  var _take = function(fallback) {
    return function(n) {
      if (hasStringIterator) {
        return function(str) {
          var accum = "";
          var iter = str[Symbol.iterator]();
          for (var i = 0; i < n; ++i) {
            var o = iter.next();
            if (o.done) return accum;
            accum += o.value;
          }
          return accum;
        };
      }
      return fallback(n);
    };
  };
  var _toCodePointArray = function(fallback) {
    return function(unsafeCodePointAt02) {
      if (hasArrayFrom) {
        return function(str) {
          return Array.from(str, unsafeCodePointAt02);
        };
      }
      return fallback;
    };
  };

  // output/Data.Enum/foreign.js
  function toCharCode(c) {
    return c.charCodeAt(0);
  }
  function fromCharCode(c) {
    return String.fromCharCode(c);
  }

  // output/Data.Enum/index.js
  var bottom1 = /* @__PURE__ */ bottom(boundedChar);
  var top1 = /* @__PURE__ */ top(boundedChar);
  var toEnum = function(dict) {
    return dict.toEnum;
  };
  var fromEnum = function(dict) {
    return dict.fromEnum;
  };
  var toEnumWithDefaults = function(dictBoundedEnum) {
    var toEnum1 = toEnum(dictBoundedEnum);
    var fromEnum1 = fromEnum(dictBoundedEnum);
    var bottom2 = bottom(dictBoundedEnum.Bounded0());
    return function(low) {
      return function(high) {
        return function(x) {
          var v = toEnum1(x);
          if (v instanceof Just) {
            return v.value0;
          }
          ;
          if (v instanceof Nothing) {
            var $140 = x < fromEnum1(bottom2);
            if ($140) {
              return low;
            }
            ;
            return high;
          }
          ;
          throw new Error("Failed pattern match at Data.Enum (line 158, column 33 - line 160, column 62): " + [v.constructor.name]);
        };
      };
    };
  };
  var defaultSucc = function(toEnum$prime) {
    return function(fromEnum$prime) {
      return function(a) {
        return toEnum$prime(fromEnum$prime(a) + 1 | 0);
      };
    };
  };
  var defaultPred = function(toEnum$prime) {
    return function(fromEnum$prime) {
      return function(a) {
        return toEnum$prime(fromEnum$prime(a) - 1 | 0);
      };
    };
  };
  var charToEnum = function(v) {
    if (v >= toCharCode(bottom1) && v <= toCharCode(top1)) {
      return new Just(fromCharCode(v));
    }
    ;
    return Nothing.value;
  };
  var enumChar = {
    succ: /* @__PURE__ */ defaultSucc(charToEnum)(toCharCode),
    pred: /* @__PURE__ */ defaultPred(charToEnum)(toCharCode),
    Ord0: function() {
      return ordChar;
    }
  };
  var boundedEnumChar = /* @__PURE__ */ (function() {
    return {
      cardinality: toCharCode(top1) - toCharCode(bottom1) | 0,
      toEnum: charToEnum,
      fromEnum: toCharCode,
      Bounded0: function() {
        return boundedChar;
      },
      Enum1: function() {
        return enumChar;
      }
    };
  })();

  // output/Data.String.CodeUnits/foreign.js
  var singleton6 = function(c) {
    return c;
  };
  var length3 = function(s) {
    return s.length;
  };
  var _indexOf = function(just) {
    return function(nothing) {
      return function(x) {
        return function(s) {
          var i = s.indexOf(x);
          return i === -1 ? nothing : just(i);
        };
      };
    };
  };
  var take3 = function(n) {
    return function(s) {
      return s.substr(0, n);
    };
  };
  var drop3 = function(n) {
    return function(s) {
      return s.substring(n);
    };
  };

  // output/Data.String.Unsafe/foreign.js
  var charAt = function(i) {
    return function(s) {
      if (i >= 0 && i < s.length) return s.charAt(i);
      throw new Error("Data.String.Unsafe.charAt: Invalid index.");
    };
  };

  // output/Data.String.CodeUnits/index.js
  var indexOf = /* @__PURE__ */ (function() {
    return _indexOf(Just.create)(Nothing.value);
  })();

  // output/Data.String.Common/foreign.js
  var split = function(sep) {
    return function(s) {
      return s.split(sep);
    };
  };

  // output/Data.String.CodePoints/index.js
  var fromEnum2 = /* @__PURE__ */ fromEnum(boundedEnumChar);
  var map3 = /* @__PURE__ */ map(functorMaybe);
  var unfoldr2 = /* @__PURE__ */ unfoldr(unfoldableArray);
  var div2 = /* @__PURE__ */ div(euclideanRingInt);
  var mod2 = /* @__PURE__ */ mod(euclideanRingInt);
  var unsurrogate = function(lead) {
    return function(trail) {
      return (((lead - 55296 | 0) * 1024 | 0) + (trail - 56320 | 0) | 0) + 65536 | 0;
    };
  };
  var isTrail = function(cu) {
    return 56320 <= cu && cu <= 57343;
  };
  var isLead = function(cu) {
    return 55296 <= cu && cu <= 56319;
  };
  var uncons3 = function(s) {
    var v = length3(s);
    if (v === 0) {
      return Nothing.value;
    }
    ;
    if (v === 1) {
      return new Just({
        head: fromEnum2(charAt(0)(s)),
        tail: ""
      });
    }
    ;
    var cu1 = fromEnum2(charAt(1)(s));
    var cu0 = fromEnum2(charAt(0)(s));
    var $43 = isLead(cu0) && isTrail(cu1);
    if ($43) {
      return new Just({
        head: unsurrogate(cu0)(cu1),
        tail: drop3(2)(s)
      });
    }
    ;
    return new Just({
      head: cu0,
      tail: drop3(1)(s)
    });
  };
  var unconsButWithTuple = function(s) {
    return map3(function(v) {
      return new Tuple(v.head, v.tail);
    })(uncons3(s));
  };
  var toCodePointArrayFallback = function(s) {
    return unfoldr2(unconsButWithTuple)(s);
  };
  var unsafeCodePointAt0Fallback = function(s) {
    var cu0 = fromEnum2(charAt(0)(s));
    var $47 = isLead(cu0) && length3(s) > 1;
    if ($47) {
      var cu1 = fromEnum2(charAt(1)(s));
      var $48 = isTrail(cu1);
      if ($48) {
        return unsurrogate(cu0)(cu1);
      }
      ;
      return cu0;
    }
    ;
    return cu0;
  };
  var unsafeCodePointAt0 = /* @__PURE__ */ _unsafeCodePointAt0(unsafeCodePointAt0Fallback);
  var toCodePointArray = /* @__PURE__ */ _toCodePointArray(toCodePointArrayFallback)(unsafeCodePointAt0);
  var length4 = function($74) {
    return length(toCodePointArray($74));
  };
  var indexOf2 = function(p) {
    return function(s) {
      return map3(function(i) {
        return length4(take3(i)(s));
      })(indexOf(p)(s));
    };
  };
  var fromCharCode2 = /* @__PURE__ */ (function() {
    var $75 = toEnumWithDefaults(boundedEnumChar)(bottom(boundedChar))(top(boundedChar));
    return function($76) {
      return singleton6($75($76));
    };
  })();
  var singletonFallback = function(v) {
    if (v <= 65535) {
      return fromCharCode2(v);
    }
    ;
    var lead = div2(v - 65536 | 0)(1024) + 55296 | 0;
    var trail = mod2(v - 65536 | 0)(1024) + 56320 | 0;
    return fromCharCode2(lead) + fromCharCode2(trail);
  };
  var singleton7 = /* @__PURE__ */ _singleton(singletonFallback);
  var takeFallback = function(v) {
    return function(v1) {
      if (v < 1) {
        return "";
      }
      ;
      var v2 = uncons3(v1);
      if (v2 instanceof Just) {
        return singleton7(v2.value0.head) + takeFallback(v - 1 | 0)(v2.value0.tail);
      }
      ;
      return v1;
    };
  };
  var take4 = /* @__PURE__ */ _take(takeFallback);
  var drop4 = function(n) {
    return function(s) {
      return drop3(length3(take4(n)(s)))(s);
    };
  };

  // output/Data.Argonaut.Decode.Decoders/index.js
  var pure2 = /* @__PURE__ */ pure(applicativeEither);
  var map4 = /* @__PURE__ */ map(functorEither);
  var lmap2 = /* @__PURE__ */ lmap(bifunctorEither);
  var composeKleisliFlipped2 = /* @__PURE__ */ composeKleisliFlipped(bindEither);
  var traverse5 = /* @__PURE__ */ traverse(traversableObject)(applicativeEither);
  var traverseWithIndex2 = /* @__PURE__ */ traverseWithIndex(traversableWithIndexArray)(applicativeEither);
  var getFieldOptional$prime = function(decoder) {
    return function(obj) {
      return function(str) {
        var decode = function(json) {
          var $35 = isNull(json);
          if ($35) {
            return pure2(Nothing.value);
          }
          ;
          return map4(Just.create)(lmap2(AtKey.create(str))(decoder(json)));
        };
        return maybe(pure2(Nothing.value))(decode)(lookup(str)(obj));
      };
    };
  };
  var getField = function(decoder) {
    return function(obj) {
      return function(str) {
        return maybe(new Left(new AtKey(str, MissingValue.value)))((function() {
          var $48 = lmap2(AtKey.create(str));
          return function($49) {
            return $48(decoder($49));
          };
        })())(lookup(str)(obj));
      };
    };
  };
  var decodeString = /* @__PURE__ */ (function() {
    return caseJsonString(new Left(new TypeMismatch("String")))(Right.create);
  })();
  var decodeNumber = /* @__PURE__ */ (function() {
    return caseJsonNumber(new Left(new TypeMismatch("Number")))(Right.create);
  })();
  var decodeJObject = /* @__PURE__ */ (function() {
    var $50 = note(new TypeMismatch("Object"));
    return function($51) {
      return $50(toObject($51));
    };
  })();
  var decodeJArray = /* @__PURE__ */ (function() {
    var $52 = note(new TypeMismatch("Array"));
    return function($53) {
      return $52(toArray($53));
    };
  })();
  var decodeInt = /* @__PURE__ */ composeKleisliFlipped2(/* @__PURE__ */ (function() {
    var $84 = note(new TypeMismatch("Integer"));
    return function($85) {
      return $84(fromNumber($85));
    };
  })())(decodeNumber);
  var decodeForeignObject = function(decoder) {
    return composeKleisliFlipped2((function() {
      var $86 = lmap2(Named.create("ForeignObject"));
      var $87 = traverse5(decoder);
      return function($88) {
        return $86($87($88));
      };
    })())(decodeJObject);
  };
  var decodeBoolean = /* @__PURE__ */ (function() {
    return caseJsonBoolean(new Left(new TypeMismatch("Boolean")))(Right.create);
  })();
  var decodeArray = function(decoder) {
    return composeKleisliFlipped2((function() {
      var $89 = lmap2(Named.create("Array"));
      var $90 = traverseWithIndex2(function(i) {
        var $92 = lmap2(AtIndex.create(i));
        return function($93) {
          return $92(decoder($93));
        };
      });
      return function($91) {
        return $89($90($91));
      };
    })())(decodeJArray);
  };

  // output/Data.Argonaut.Decode.Class/index.js
  var decodeJsonString = {
    decodeJson: decodeString
  };
  var decodeJsonNumber = {
    decodeJson: decodeNumber
  };
  var decodeJsonJson = /* @__PURE__ */ (function() {
    return {
      decodeJson: Right.create
    };
  })();
  var decodeJsonInt = {
    decodeJson: decodeInt
  };
  var decodeJsonBoolean = {
    decodeJson: decodeBoolean
  };
  var decodeJson = function(dict) {
    return dict.decodeJson;
  };
  var decodeForeignObject2 = function(dictDecodeJson) {
    return {
      decodeJson: decodeForeignObject(decodeJson(dictDecodeJson))
    };
  };
  var decodeArray2 = function(dictDecodeJson) {
    return {
      decodeJson: decodeArray(decodeJson(dictDecodeJson))
    };
  };

  // output/Data.Argonaut.Decode.Combinators/index.js
  var getFieldOptional$prime2 = function(dictDecodeJson) {
    return getFieldOptional$prime(decodeJson(dictDecodeJson));
  };
  var getField2 = function(dictDecodeJson) {
    return getField(decodeJson(dictDecodeJson));
  };

  // output/Data.Deck/index.js
  var defaultDeckMeta = {
    title: "Untitled Deck",
    description: "",
    tags: [],
    sources: []
  };

  // output/Data.Face/index.js
  var bind2 = /* @__PURE__ */ bind(bindEither);
  var decodeJson2 = /* @__PURE__ */ decodeJson(/* @__PURE__ */ decodeForeignObject2(decodeJsonJson));
  var map5 = /* @__PURE__ */ map(functorEither);
  var getFieldOptional$prime3 = /* @__PURE__ */ getFieldOptional$prime2(decodeJsonString);
  var pure3 = /* @__PURE__ */ pure(applicativeEither);
  var getField3 = /* @__PURE__ */ getField2(decodeJsonString);
  var getFieldOptional$prime1 = /* @__PURE__ */ getFieldOptional$prime2(decodeJsonNumber);
  var getFieldOptional$prime22 = /* @__PURE__ */ getFieldOptional$prime2(decodeJsonBoolean);
  var TextFace = /* @__PURE__ */ (function() {
    function TextFace2(value0) {
      this.value0 = value0;
    }
    ;
    TextFace2.create = function(value0) {
      return new TextFace2(value0);
    };
    return TextFace2;
  })();
  var MarkdownFace = /* @__PURE__ */ (function() {
    function MarkdownFace2(value0) {
      this.value0 = value0;
    }
    ;
    MarkdownFace2.create = function(value0) {
      return new MarkdownFace2(value0);
    };
    return MarkdownFace2;
  })();
  var ImageFace = /* @__PURE__ */ (function() {
    function ImageFace2(value0) {
      this.value0 = value0;
    }
    ;
    ImageFace2.create = function(value0) {
      return new ImageFace2(value0);
    };
    return ImageFace2;
  })();
  var AudioFace = /* @__PURE__ */ (function() {
    function AudioFace2(value0) {
      this.value0 = value0;
    }
    ;
    AudioFace2.create = function(value0) {
      return new AudioFace2(value0);
    };
    return AudioFace2;
  })();
  var decodeFaceType$prime = function(typeName) {
    return function(json) {
      return bind2(decodeJson2(json))(function(obj) {
        if (typeName === "TextFace") {
          return bind2(map5(fromMaybe(""))(getFieldOptional$prime3(obj)("text")))(function(text) {
            return pure3(new TextFace({
              text
            }));
          });
        }
        ;
        if (typeName === "MarkdownFace") {
          return bind2(map5(fromMaybe(""))(getFieldOptional$prime3(obj)("text")))(function(text) {
            return pure3(new MarkdownFace({
              text
            }));
          });
        }
        ;
        if (typeName === "ImageFace") {
          return bind2(map5(fromMaybe(""))(getFieldOptional$prime3(obj)("src")))(function(src) {
            return bind2(map5(fromMaybe(""))(getFieldOptional$prime3(obj)("alt")))(function(alt2) {
              return pure3(new ImageFace({
                src,
                alt: alt2
              }));
            });
          });
        }
        ;
        if (typeName === "AudioFace") {
          return bind2(map5(fromMaybe(""))(getFieldOptional$prime3(obj)("src")))(function(src) {
            return bind2(map5(fromMaybe(""))(getFieldOptional$prime3(obj)("label")))(function(label) {
              return pure3(new AudioFace({
                src,
                label
              }));
            });
          });
        }
        ;
        return bind2(map5(fromMaybe(""))(getFieldOptional$prime3(obj)("text")))(function(text) {
          return pure3(new TextFace({
            text
          }));
        });
      });
    };
  };
  var decodeFaceFromJson = function(json) {
    return bind2(decodeJson2(json))(function(obj) {
      return bind2(getField3(obj)("type"))(function(v) {
        return bind2(map5(fromMaybe(1))(getFieldOptional$prime1(obj)("priority")))(function(priority) {
          return bind2(map5(fromMaybe(1))(getFieldOptional$prime1(obj)("momentum")))(function(momentum) {
            return bind2(map5(fromMaybe(true))(getFieldOptional$prime22(obj)("link_siblings")))(function(linkSiblings) {
              return bind2(decodeFaceType$prime(v)(json))(function(faceType) {
                return pure3({
                  faceType,
                  priority,
                  momentum,
                  linkSiblings
                });
              });
            });
          });
        });
      });
    });
  };

  // output/Data.Settings/index.js
  var defaultSettings = {
    learningRate: 2,
    defaultFacePriority: 1,
    defaultLinkSiblings: true
  };

  // output/DriveSync/foreign.js
  var _accessToken = null;
  var _tokenExpiry = 0;
  var _syncFolderId = null;
  var _tokenClient = null;
  function getClientId() {
    return window.__UMEMO_GOOGLE_CLIENT_ID || "";
  }
  var driveSignIn = function(onSuccess) {
    return function(onError) {
      return function() {
        var clientId = getClientId();
        if (!clientId) {
          onError("No Google Client ID configured")();
          return;
        }
        if (typeof google === "undefined" || !google.accounts) {
          onError("Google Identity Services not loaded")();
          return;
        }
        _tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "https://www.googleapis.com/auth/drive.file",
          callback: function(resp) {
            if (resp.error) {
              onError(resp.error_description || resp.error)();
              return;
            }
            _accessToken = resp.access_token;
            _tokenExpiry = Date.now() + resp.expires_in * 1e3;
            localStorage.setItem("umemo_drive_token", JSON.stringify({
              token: _accessToken,
              expiry: _tokenExpiry
            }));
            onSuccess()();
          }
        });
        _tokenClient.requestAccessToken();
      };
    };
  };
  var driveSignOut = function() {
    _accessToken = null;
    _tokenExpiry = 0;
    _syncFolderId = null;
    _tokenClient = null;
    localStorage.removeItem("umemo_drive_token");
  };
  var isDriveConnected = function() {
    _restoreToken();
    return _accessToken !== null && Date.now() < _tokenExpiry;
  };
  function _restoreToken() {
    if (_accessToken && Date.now() < _tokenExpiry) return;
    try {
      var stored = JSON.parse(localStorage.getItem("umemo_drive_token"));
      if (stored && stored.token && stored.expiry > Date.now()) {
        _accessToken = stored.token;
        _tokenExpiry = stored.expiry;
      } else {
        _accessToken = null;
        _tokenExpiry = 0;
      }
    } catch (e) {
      _accessToken = null;
      _tokenExpiry = 0;
    }
  }
  function _ensureToken() {
    return new Promise(function(resolve, reject) {
      _restoreToken();
      if (_accessToken && _tokenExpiry - Date.now() > 6e4) {
        resolve();
        return;
      }
      var clientId = getClientId();
      if (!clientId || typeof google === "undefined" || !google.accounts) {
        reject(new Error("Cannot refresh token"));
        return;
      }
      if (!_tokenClient) {
        _tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "https://www.googleapis.com/auth/drive.file",
          callback: function() {
          }
          // replaced below
        });
      }
      _tokenClient.callback = function(resp) {
        if (resp.error) {
          _accessToken = null;
          _tokenExpiry = 0;
          reject(new Error(resp.error_description || resp.error));
          return;
        }
        _accessToken = resp.access_token;
        _tokenExpiry = Date.now() + resp.expires_in * 1e3;
        localStorage.setItem("umemo_drive_token", JSON.stringify({
          token: _accessToken,
          expiry: _tokenExpiry
        }));
        resolve();
      };
      _tokenClient.requestAccessToken({ prompt: "" });
    });
  }
  function _authHeaders() {
    _restoreToken();
    return { "Authorization": "Bearer " + _accessToken };
  }
  var SYNC_FOLDER_NAME = "umemo-sync";
  var DRIVE_API = "https://www.googleapis.com/drive/v3";
  var DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3";
  async function _driveGet(path, params) {
    var url = DRIVE_API + path;
    if (params) {
      url += "?" + new URLSearchParams(params).toString();
    }
    var resp = await fetch(url, { headers: _authHeaders() });
    if (!resp.ok) throw new Error("Drive API " + resp.status + ": " + await resp.text());
    return resp.json();
  }
  async function _findOrCreateFolder() {
    if (_syncFolderId) return _syncFolderId;
    var q = "name='" + SYNC_FOLDER_NAME + "' and mimeType='application/vnd.google-apps.folder' and trashed=false";
    var result = await _driveGet("/files", { q, spaces: "drive", fields: "files(id,name)" });
    if (result.files && result.files.length > 0) {
      _syncFolderId = result.files[0].id;
      return _syncFolderId;
    }
    var resp = await fetch(DRIVE_API + "/files", {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, _authHeaders()),
      body: JSON.stringify({
        name: SYNC_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder"
      })
    });
    if (!resp.ok) throw new Error("Failed to create sync folder: " + resp.status);
    var folder = await resp.json();
    _syncFolderId = folder.id;
    return _syncFolderId;
  }
  async function _findFile(folderId, name) {
    var q = "name='" + name + "' and '" + folderId + "' in parents and trashed=false";
    var result = await _driveGet("/files", {
      q,
      spaces: "drive",
      fields: "files(id,name,modifiedTime)"
    });
    return result.files && result.files.length > 0 ? result.files[0] : null;
  }
  async function _uploadFile(folderId, name, data) {
    var jsonStr = JSON.stringify(data);
    var existing = await _findFile(folderId, name);
    if (existing) {
      var resp = await fetch(DRIVE_UPLOAD + "/files/" + existing.id + "?uploadType=media", {
        method: "PATCH",
        headers: Object.assign({ "Content-Type": "application/json" }, _authHeaders()),
        body: jsonStr
      });
      if (!resp.ok) throw new Error("Failed to update " + name + ": " + resp.status);
      return resp.json();
    } else {
      var metadata = { name, parents: [folderId] };
      var boundary = "umemo_boundary_" + Date.now();
      var body = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + JSON.stringify(metadata) + "\r\n--" + boundary + "\r\nContent-Type: application/json\r\n\r\n" + jsonStr + "\r\n--" + boundary + "--";
      var resp = await fetch(DRIVE_UPLOAD + "/files?uploadType=multipart", {
        method: "POST",
        headers: Object.assign({
          "Content-Type": "multipart/related; boundary=" + boundary
        }, _authHeaders()),
        body
      });
      if (!resp.ok) throw new Error("Failed to create " + name + ": " + resp.status);
      return resp.json();
    }
  }
  async function _downloadFile(fileId) {
    var resp = await fetch(DRIVE_API + "/files/" + fileId + "?alt=media", {
      headers: _authHeaders()
    });
    if (!resp.ok) throw new Error("Failed to download file: " + resp.status);
    return resp.json();
  }
  async function _deleteFileByName(folderId, name) {
    var file = await _findFile(folderId, name);
    if (!file) return;
    var resp = await fetch(DRIVE_API + "/files/" + file.id, {
      method: "DELETE",
      headers: _authHeaders()
    });
    if (!resp.ok && resp.status !== 404)
      throw new Error("Failed to delete " + name + ": " + resp.status);
  }
  function _journalKey(deckId) {
    return "umemo_journal_" + deckId;
  }
  var appendJournal = function(deckId, entry) {
    var key = _journalKey(deckId);
    var journal = [];
    try {
      journal = JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
    }
    journal.push(entry);
    localStorage.setItem(key, JSON.stringify(journal));
  };
  window._appendJournal = appendJournal;
  function _getJournal(deckId) {
    try {
      return JSON.parse(localStorage.getItem(_journalKey(deckId))) || [];
    } catch (e) {
      return [];
    }
  }
  function _clearJournal(deckId) {
    localStorage.removeItem(_journalKey(deckId));
  }
  function _openDB() {
    return new Promise(function(resolve, reject) {
      var req = indexedDB.open("umemo", 5);
      req.onsuccess = function(e) {
        resolve(e.target.result);
      };
      req.onerror = function(e) {
        reject(e.target.error);
      };
    });
  }
  var _dsDeckDBs = {};
  function _openDeckDB(deckId) {
    return new Promise(function(resolve, reject) {
      if (_dsDeckDBs[deckId]) {
        resolve(_dsDeckDBs[deckId]);
        return;
      }
      var req = indexedDB.open("umemo-deck-" + deckId, 1);
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains("faces")) {
          var fs = db.createObjectStore("faces", { keyPath: "faceId", autoIncrement: true });
          fs.createIndex("position", "position");
          fs.createIndex("cardId", "cardId");
          fs.createIndex("externalId", ["externalSource", "externalId"], { unique: false });
        }
      };
      req.onsuccess = function(e) {
        _dsDeckDBs[deckId] = e.target.result;
        resolve(_dsDeckDBs[deckId]);
      };
      req.onerror = function(e) {
        reject(e.target.error);
      };
    });
  }
  function _localDeleteDeck(db, deckId) {
    return new Promise(function(resolve) {
      var tx = db.transaction(["decks", "deckMeta"], "readwrite");
      tx.objectStore("decks").delete(deckId);
      tx.objectStore("deckMeta").delete(deckId);
      tx.oncomplete = function() {
        if (_dsDeckDBs[deckId]) {
          _dsDeckDBs[deckId].close();
          delete _dsDeckDBs[deckId];
        }
        var delReq = indexedDB.deleteDatabase("umemo-deck-" + deckId);
        delReq.onsuccess = resolve;
        delReq.onerror = resolve;
      };
    });
  }
  function _localDeckExists(db, deckId) {
    return new Promise(function(resolve) {
      var tx = db.transaction("decks", "readonly");
      var req = tx.objectStore("decks").get(deckId);
      req.onsuccess = function() {
        resolve(!!req.result);
      };
    });
  }
  async function _exportDeckContent(deckId) {
    var db = await _openDB();
    var deckDB = await _openDeckDB(deckId);
    var meta = await new Promise(function(resolve) {
      var tx = db.transaction("deckMeta", "readonly");
      var req = tx.objectStore("deckMeta").get(deckId);
      req.onsuccess = function() {
        resolve(req.result || { deckId, title: "", description: "", tags: [], sources: [] });
      };
    });
    var faces = await new Promise(function(resolve) {
      var tx = deckDB.transaction("faces", "readonly");
      var req = tx.objectStore("faces").getAll();
      req.onsuccess = function() {
        resolve((req.result || []).map(function(f) {
          return {
            faceId: f.faceId,
            cardId: f.cardId,
            contents: f.contents,
            externalSource: f.externalSource || null,
            externalId: f.externalId || null
          };
        }));
      };
    });
    return { deckId, meta, faces };
  }
  async function _exportDeckState(deckId) {
    var deckDB = await _openDeckDB(deckId);
    return new Promise(function(resolve) {
      var tx = deckDB.transaction("faces", "readonly");
      var req = tx.objectStore("faces").getAll();
      req.onsuccess = function() {
        var state = {};
        for (var f of req.result) {
          state[f.faceId] = {
            position: f.position,
            momentum: f.momentum || 1,
            ts: f._ts || 0
          };
        }
        resolve(state);
      };
    });
  }
  var SHARD_BASE = 1e3;
  function _shardIdx(faceId) {
    return Math.floor(Math.log2(faceId / SHARD_BASE + 1));
  }
  function _shardFileName(deckId, shardIdx) {
    return "deck-" + deckId + "-shard-" + shardIdx + ".json";
  }
  async function _listShardFiles(folderId, deckId) {
    var newPrefix = "deck-" + deckId + "-shard-";
    var oldPrefix = "deck-" + deckId + "-state-";
    var q = "(name contains '" + newPrefix + "' or name contains '" + oldPrefix + "') and '" + folderId + "' in parents and trashed=false";
    var result = await _driveGet("/files", {
      q,
      spaces: "drive",
      fields: "files(id,name,modifiedTime)",
      pageSize: "1000"
    });
    return (result.files || []).filter(function(f) {
      if (f.name === "deck-" + deckId + "-state.json") return false;
      return f.name.startsWith(newPrefix) || f.name.startsWith(oldPrefix);
    });
  }
  async function _exportDeckStateForShards(deckId, shardIndices) {
    var deckDB = await _openDeckDB(deckId);
    var shardSet = new Set(shardIndices);
    return new Promise(function(resolve) {
      var tx = deckDB.transaction("faces", "readonly");
      var req = tx.objectStore("faces").getAll();
      req.onsuccess = function() {
        var shards = {};
        for (var f of req.result) {
          var si = _shardIdx(f.faceId);
          if (!shardSet.has(si)) continue;
          if (!shards[si]) shards[si] = {};
          shards[si][f.faceId] = {
            position: f.position,
            momentum: f.momentum || 1,
            ts: f._ts || 0
          };
        }
        resolve(shards);
      };
    });
  }
  async function _exportAllShards(deckId) {
    var deckDB = await _openDeckDB(deckId);
    return new Promise(function(resolve) {
      var tx = deckDB.transaction("faces", "readonly");
      var req = tx.objectStore("faces").getAll();
      req.onsuccess = function() {
        var shards = {};
        for (var f of req.result) {
          if (!f._ts && f.position == null && (!f.momentum || f.momentum === 1)) continue;
          var si = _shardIdx(f.faceId);
          if (!shards[si]) shards[si] = {};
          shards[si][f.faceId] = {
            position: f.position,
            momentum: f.momentum || 1,
            ts: f._ts || 0
          };
        }
        resolve(shards);
      };
    });
  }
  async function _pullAllShards(folderId, deckId) {
    var files = await _listShardFiles(folderId, deckId);
    var state = {};
    for (var f of files) {
      var shard = await _downloadFile(f.id);
      for (var fid in shard) {
        state[fid] = shard[fid];
      }
    }
    return state;
  }
  async function _migrateLegacyState(folderId, deckId) {
    var legacyFile = await _findFile(folderId, "deck-" + deckId + "-state.json");
    if (!legacyFile) return null;
    var state = await _downloadFile(legacyFile.id);
    await _deleteFileByName(folderId, "deck-" + deckId + "-state.json");
    return state;
  }
  var AVG_STATE_BYTES_PER_FACE = 50;
  function _shouldCompact(journal) {
    if (journal.length === 0) return false;
    var journalBytes = JSON.stringify(journal).length;
    var entryAvg = journalBytes / journal.length;
    var storedCount = parseInt(localStorage.getItem("umemo_face_count") || "0");
    var stateBytes = Math.max(storedCount, 1e3) * AVG_STATE_BYTES_PER_FACE;
    return journalBytes > Math.sqrt(2 * stateBytes * entryAvg);
  }
  async function _getManifest(folderId) {
    var file = await _findFile(folderId, "manifest.json");
    if (!file) return { decks: {} };
    return await _downloadFile(file.id);
  }
  async function _putManifest(folderId, manifest) {
    manifest.lastSync = (/* @__PURE__ */ new Date()).toISOString();
    await _uploadFile(folderId, "manifest.json", manifest);
    localStorage.setItem("umemo_last_sync", manifest.lastSync);
  }
  function _isDeckAlive(entry) {
    if (!entry || !entry.createdAt) return false;
    if (entry.deletedAt && entry.deletedAt >= entry.createdAt) return false;
    return true;
  }
  function _mergeManifests(a, b) {
    var merged = { decks: {} };
    var allIds = Object.keys(Object.assign({}, a.decks || {}, b.decks || {}));
    for (var id2 of allIds) {
      var ea = (a.decks || {})[id2] || {};
      var eb = (b.decks || {})[id2] || {};
      merged.decks[id2] = {
        createdAt: Math.max(ea.createdAt || 0, eb.createdAt || 0)
      };
      var maxDel = Math.max(ea.deletedAt || 0, eb.deletedAt || 0);
      if (maxDel > 0) merged.decks[id2].deletedAt = maxDel;
    }
    return merged;
  }
  function _mergeStates(local, remote) {
    var merged = Object.assign({}, remote);
    for (var fid in local) {
      if (!merged[fid] || (local[fid].ts || 0) > (merged[fid].ts || 0)) {
        merged[fid] = local[fid];
      }
    }
    return merged;
  }
  function _applyJournal(state, journal) {
    for (var entry of journal) {
      var fid = String(entry.faceId);
      var existing = state[fid];
      if (!existing || (entry.timestamp || 0) > (existing.ts || 0)) {
        state[fid] = {
          position: entry.position,
          momentum: entry.momentum,
          ts: entry.timestamp || 0
        };
      }
    }
    return state;
  }
  function _dedupeJournal(entries) {
    var seen = {};
    var result = [];
    for (var e of entries) {
      var key = String(e.faceId) + ":" + String(e.timestamp || 0);
      if (!seen[key]) {
        seen[key] = true;
        result.push(e);
      }
    }
    return result.sort(function(a, b) {
      return (a.timestamp || 0) - (b.timestamp || 0);
    });
  }
  async function _pushDeck(folderId, deckId) {
    var journal = _getJournal(deckId);
    var contentFile = await _findFile(folderId, "deck-" + deckId + "-content.json");
    if (!contentFile) {
      var content = await _exportDeckContent(deckId);
      await _uploadFile(folderId, "deck-" + deckId + "-content.json", content);
      var shards = await _exportAllShards(deckId);
      var totalFaces = 0;
      for (var si in shards) {
        await _uploadFile(folderId, _shardFileName(deckId, si), shards[si]);
        totalFaces += Object.keys(shards[si]).length;
      }
      await _uploadFile(folderId, "deck-" + deckId + "-journal.json", []);
      localStorage.setItem("umemo_face_count", String(totalFaces));
      _clearJournal(deckId);
      return;
    }
    var existingShards = await _listShardFiles(folderId, deckId);
    if (existingShards.length === 0) {
      var fullState = await _exportDeckState(deckId);
      var shards = {};
      for (var fid in fullState) {
        var s = fullState[fid];
        if (!s.ts && s.position == null && (!s.momentum || s.momentum === 1)) continue;
        var si = _shardIdx(parseInt(fid));
        if (!shards[si]) shards[si] = {};
        shards[si][fid] = s;
      }
      var pendingJournal = _getJournal(deckId);
      for (var je of pendingJournal) {
        var jsi = _shardIdx(je.faceId);
        if (!shards[jsi]) shards[jsi] = {};
        shards[jsi][je.faceId] = {
          position: je.position,
          momentum: je.momentum,
          ts: je.timestamp || 0
        };
      }
      for (var si in shards) {
        await _uploadFile(folderId, _shardFileName(deckId, si), shards[si]);
      }
    }
    if (journal.length === 0) return;
    var journalFile = await _findFile(folderId, "deck-" + deckId + "-journal.json");
    var remoteJournal = journalFile ? await _downloadFile(journalFile.id) : [];
    var merged = _dedupeJournal(remoteJournal.concat(journal));
    await _uploadFile(folderId, "deck-" + deckId + "-journal.json", merged);
    if (_shouldCompact(merged)) {
      var dirtyShards = /* @__PURE__ */ new Set();
      for (var entry of merged) {
        dirtyShards.add(_shardIdx(entry.faceId));
      }
      var dirtyIndices = Array.from(dirtyShards);
      var localShards = await _exportDeckStateForShards(deckId, dirtyIndices);
      var totalFaces = parseInt(localStorage.getItem("umemo_face_count") || "0");
      for (var di of dirtyIndices) {
        var remoteShardFile = await _findFile(folderId, _shardFileName(deckId, di));
        var remoteShard = remoteShardFile ? await _downloadFile(remoteShardFile.id) : {};
        var localShard = localShards[di] || {};
        var mergedShard = _mergeStates(localShard, remoteShard);
        mergedShard = _applyJournal(mergedShard, merged);
        var finalShard = {};
        for (var fid in mergedShard) {
          if (_shardIdx(parseInt(fid)) === di) {
            finalShard[fid] = mergedShard[fid];
          }
        }
        if (Object.keys(finalShard).length > 0) {
          await _uploadFile(folderId, _shardFileName(deckId, di), finalShard);
        }
      }
      await _uploadFile(folderId, "deck-" + deckId + "-journal.json", []);
      var oldPrefix = "deck-" + deckId + "-state-";
      var allFiles = await _listShardFiles(folderId, deckId);
      for (var sf of allFiles) {
        if (sf.name.startsWith(oldPrefix)) {
          await fetch(DRIVE_API + "/files/" + sf.id, {
            method: "DELETE",
            headers: _authHeaders()
          });
        }
      }
    }
    _clearJournal(deckId);
  }
  var pushSync = function(onSuccess) {
    return function(onError) {
      return function() {
        if (!isDriveConnected()) {
          onError("Not connected to Google Drive")();
          return;
        }
        _ensureToken().then(function() {
          return _findOrCreateFolder();
        }).then(async function(folderId) {
          try {
            var db = await _openDB();
            var decks = await new Promise(function(resolve) {
              var tx = db.transaction("decks", "readonly");
              var req = tx.objectStore("decks").getAll();
              req.onsuccess = function() {
                resolve(req.result || []);
              };
            });
            for (var d of decks) {
              if (!_isLocallyDeleted(d.id)) {
                await _pushDeck(folderId, d.id);
              }
            }
            var manifest = await _getManifest(folderId);
            var localManifest = { decks: {} };
            for (var d of decks) {
              if (_isLocallyDeleted(d.id)) continue;
              var existing = (manifest.decks || {})[d.id];
              if (existing && _isDeckAlive(existing)) {
                localManifest.decks[d.id] = existing;
              } else if (!existing) {
                localManifest.decks[d.id] = { createdAt: Date.now() };
              }
            }
            var merged = _mergeManifests(manifest, localManifest);
            await _putManifest(folderId, merged);
            onSuccess()();
          } catch (e) {
            onError(e.message || "Push failed")();
          }
        }).catch(function(e) {
          onError(e.message || "Push failed")();
        });
      };
    };
  };
  async function _pullDeck(folderId, deckId) {
    var db = await _openDB();
    var deckDB = await _openDeckDB(deckId);
    var contentFile = await _findFile(folderId, "deck-" + deckId + "-content.json");
    if (!contentFile) return;
    var content = await _downloadFile(contentFile.id);
    var legacyState = await _migrateLegacyState(folderId, deckId);
    var remoteState = await _pullAllShards(folderId, deckId);
    if (legacyState) {
      remoteState = _mergeStates(legacyState, remoteState);
    }
    var journalFile = await _findFile(folderId, "deck-" + deckId + "-journal.json");
    var remoteJournal = journalFile ? await _downloadFile(journalFile.id) : [];
    var localJournal = _getJournal(deckId);
    var allJournal = _dedupeJournal(remoteJournal.concat(localJournal));
    var localState = await _exportDeckState(deckId);
    var mergedState = _mergeStates(localState, remoteState);
    mergedState = _applyJournal(mergedState, allJournal);
    await new Promise(function(resolve) {
      var tx = db.transaction(["decks", "deckMeta"], "readwrite");
      tx.objectStore("decks").put({ id: deckId, user: "default" });
      if (content.meta) {
        var metaRecord = Object.assign({}, content.meta, { deckId });
        if (content.faces) metaRecord.cardCount = content.faces.length;
        tx.objectStore("deckMeta").put(metaRecord);
      }
      tx.oncomplete = resolve;
    });
    if (content.faces) {
      await new Promise(function(resolve) {
        var tx = deckDB.transaction("faces", "readwrite");
        var faceStore = tx.objectStore("faces");
        for (var f of content.faces) {
          var s = mergedState[f.faceId] || {};
          faceStore.put({
            faceId: f.faceId,
            cardId: f.cardId,
            contents: f.contents,
            position: s.position !== void 0 ? s.position : null,
            momentum: s.momentum !== void 0 ? s.momentum : 1,
            _ts: s.ts || 0,
            externalSource: f.externalSource || null,
            externalId: f.externalId || null
          });
        }
        tx.oncomplete = resolve;
      });
    }
  }
  function _isLocallyDeleted(deckId) {
    try {
      var set = JSON.parse(localStorage.getItem("umemo_deleted_decks") || "{}");
      return !!set[deckId];
    } catch (e) {
      return false;
    }
  }
  function _markLocallyDeleted(deckId) {
    try {
      var set = JSON.parse(localStorage.getItem("umemo_deleted_decks") || "{}");
      set[deckId] = Date.now();
      localStorage.setItem("umemo_deleted_decks", JSON.stringify(set));
    } catch (e) {
    }
  }
  function _unmarkLocallyDeleted(deckId) {
    try {
      var set = JSON.parse(localStorage.getItem("umemo_deleted_decks") || "{}");
      delete set[deckId];
      localStorage.setItem("umemo_deleted_decks", JSON.stringify(set));
    } catch (e) {
    }
  }
  var pullSync = function(onSuccess) {
    return function(onError) {
      return function() {
        if (!isDriveConnected()) {
          onError("Not connected to Google Drive")();
          return;
        }
        _ensureToken().then(function() {
          return _findOrCreateFolder();
        }).then(async function(folderId) {
          try {
            var db = await _openDB();
            var manifest = await _getManifest(folderId);
            var deckEntries = manifest.decks || {};
            for (var deckId in deckEntries) {
              if (_isLocallyDeleted(deckId)) {
                if (!_isDeckAlive(deckEntries[deckId])) {
                  _unmarkLocallyDeleted(deckId);
                }
                continue;
              }
              if (_isDeckAlive(deckEntries[deckId])) {
                await _pullDeck(folderId, deckId);
              } else {
                if (await _localDeckExists(db, deckId)) {
                  await _localDeleteDeck(db, deckId);
                  _clearJournal(deckId);
                }
              }
            }
            localStorage.setItem("umemo_last_sync", (/* @__PURE__ */ new Date()).toISOString());
            onSuccess()();
          } catch (e) {
            onError(e.message || "Pull failed")();
          }
        }).catch(function(e) {
          onError(e.message || "Pull failed")();
        });
      };
    };
  };
  var fullSync = function(onSuccess) {
    return function(onError) {
      return function() {
        pullSync(function() {
          return function() {
            pushSync(onSuccess)(onError)();
          };
        })(onError)();
      };
    };
  };
  var deleteDeckFromDrive = function(deckId) {
    return function(onDone) {
      return function() {
        _markLocallyDeleted(deckId);
        if (!isDriveConnected()) {
          onDone()();
          return;
        }
        _ensureToken().then(function() {
          return _findOrCreateFolder();
        }).then(async function(folderId) {
          try {
            var manifest = await _getManifest(folderId);
            if (!manifest.decks) manifest.decks = {};
            if (!manifest.decks[deckId]) manifest.decks[deckId] = {};
            manifest.decks[deckId].deletedAt = Date.now();
            await _putManifest(folderId, manifest);
            await _deleteFileByName(folderId, "deck-" + deckId + "-content.json");
            await _deleteFileByName(folderId, "deck-" + deckId + "-state.json");
            await _deleteFileByName(folderId, "deck-" + deckId + "-journal.json");
            var shardFiles = await _listShardFiles(folderId, deckId);
            for (var sf of shardFiles) {
              await fetch(DRIVE_API + "/files/" + sf.id, {
                method: "DELETE",
                headers: _authHeaders()
              });
            }
            _unmarkLocallyDeleted(deckId);
          } catch (e) {
            console.error("Failed to delete deck from Drive:", e);
          }
          onDone()();
        }).catch(function() {
          onDone()();
        });
      };
    };
  };
  var pushDeckContent = function(deckId) {
    return function(onSuccess) {
      return function(onError) {
        return function() {
          _unmarkLocallyDeleted(deckId);
          if (!isDriveConnected()) {
            onError("Not connected")();
            return;
          }
          _ensureToken().then(function() {
            return _findOrCreateFolder();
          }).then(async function(folderId) {
            try {
              var content = await _exportDeckContent(deckId);
              await _uploadFile(folderId, "deck-" + deckId + "-content.json", content);
              var manifest = await _getManifest(folderId);
              if (!manifest.decks) manifest.decks = {};
              manifest.decks[deckId] = { createdAt: Date.now() };
              await _putManifest(folderId, manifest);
              onSuccess()();
            } catch (e) {
              onError(e.message || "Failed")();
            }
          }).catch(function(e) {
            onError(e.message || "Failed")();
          });
        };
      };
    };
  };
  window._syncState = { status: "idle", error: null };
  function _setSyncState(status, error) {
    window._syncState = { status, error: error || null };
    var dots = document.querySelectorAll(".sync-dot");
    dots.forEach(function(dot) {
      dot.className = "sync-dot sync-dot--" + status;
      dot.title = status === "error" ? error || "Sync failed" : status === "syncing" ? "Syncing\u2026" : status === "done" ? "Synced" : "";
    });
    _updatePlaySyncPopover();
  }
  function _updatePlaySyncPopover() {
    var pop = document.getElementById("play-sync-popover");
    if (!pop) return;
    var details = getSyncDetails();
    var lastLabel = details.lastSync ? details.lastSync : "never";
    var pendingLabel = details.pendingEntries > 0 ? details.pendingEntries + " pending" : "none";
    var html = '<div class="sync-detail-row">Status: ' + details.status + '</div><div class="sync-detail-row">Last sync: ' + lastLabel + `</div><div class="sync-detail-row">Unsync'd votes: ` + pendingLabel + "</div>";
    if (details.error) {
      html += '<div class="sync-detail-row sync-detail-error">\u26A0 ' + details.error + "</div>";
    }
    pop.innerHTML = html;
  }
  var getSyncDetails = function() {
    var connected = isDriveConnected();
    var lastSync = localStorage.getItem("umemo_last_sync") || "";
    var pending = 0;
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.startsWith("umemo_journal_")) {
        try {
          pending += JSON.parse(localStorage.getItem(k)).length;
        } catch (e) {
        }
      }
    }
    return {
      connected,
      lastSync,
      pendingEntries: pending,
      status: (window._syncState || {}).status || "idle",
      error: (window._syncState || {}).error || ""
    };
  };
  window._driveSyncModule = {
    fullSync,
    pushSync,
    pullSync,
    pushDeckContent
  };
  window._setSyncState = _setSyncState;
  window._updatePlaySyncPopover = _updatePlaySyncPopover;
  window._deleteDeckFromDrive = function(deckId) {
    deleteDeckFromDrive(deckId)(function() {
      return function() {
      };
    })();
  };

  // output/Port/foreign.js
  var _db = null;
  var DB_NAME = "umemo";
  var DB_VERSION = 5;
  var _deckDBs = {};
  function openDB() {
    return new Promise((resolve, reject) => {
      if (_db) {
        resolve(_db);
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("decks")) {
          db.createObjectStore("decks", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("deckMeta")) {
          db.createObjectStore("deckMeta", { keyPath: "deckId" });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      };
      req.onsuccess = (e) => {
        _db = e.target.result;
        resolve(_db);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }
  function openDeckDB(deckId) {
    return new Promise((resolve, reject) => {
      if (_deckDBs[deckId]) {
        resolve(_deckDBs[deckId]);
        return;
      }
      const req = indexedDB.open("umemo-deck-" + deckId, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("faces")) {
          const fs = db.createObjectStore("faces", { keyPath: "faceId", autoIncrement: true });
          fs.createIndex("position", "position");
          fs.createIndex("cardId", "cardId");
          fs.createIndex("externalId", ["externalSource", "externalId"], { unique: false });
        }
      };
      req.onsuccess = (e) => {
        _deckDBs[deckId] = e.target.result;
        resolve(_deckDBs[deckId]);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }
  async function _migrateIfNeeded() {
    if (localStorage.getItem("umemo_perdeckdb_migrated")) return;
    const db = await openDB();
    if (!db.objectStoreNames.contains("faces")) {
      localStorage.setItem("umemo_perdeckdb_migrated", "1");
      return;
    }
    const faces = await new Promise((resolve) => {
      const tx = db.transaction("faces", "readonly");
      const req = tx.objectStore("faces").getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
    if (faces.length === 0) {
      localStorage.setItem("umemo_perdeckdb_migrated", "1");
      return;
    }
    const byDeck = {};
    for (const f of faces) {
      if (!byDeck[f.deckId]) byDeck[f.deckId] = [];
      byDeck[f.deckId].push(f);
    }
    for (const deckId of Object.keys(byDeck)) {
      const deckDB = await openDeckDB(deckId);
      const sorted = byDeck[deckId].sort((a, b) => (a.faceId || 0) - (b.faceId || 0));
      await new Promise((resolve) => {
        const tx = deckDB.transaction("faces", "readwrite");
        const store = tx.objectStore("faces");
        for (const f of sorted) {
          const copy = Object.assign({}, f);
          delete copy.faceId;
          delete copy.deckId;
          store.add(copy);
        }
        tx.oncomplete = resolve;
      });
    }
    await new Promise((resolve) => {
      const tx = db.transaction("faces", "readwrite");
      tx.objectStore("faces").clear();
      tx.oncomplete = resolve;
    });
    localStorage.setItem("umemo_perdeckdb_migrated", "1");
  }
  var initDB = function(callback) {
    return function() {
      openDB().then(() => _migrateIfNeeded()).then(() => {
        if (navigator.storage && navigator.storage.persist) {
          navigator.storage.persist().then((granted) => {
            if (granted) console.log("Storage persistence granted");
          });
        }
        callback();
      }).catch((e) => {
        console.error("initDB failed:", e);
        callback();
      });
    };
  };
  var listDecks = function(user) {
    return function(callback) {
      return function() {
        openDB().then((db) => {
          const tx = db.transaction("decks", "readonly");
          const store = tx.objectStore("decks");
          const req = store.getAll();
          req.onsuccess = () => {
            const results = req.result.filter((d) => d.user === user);
            callback(results)();
          };
        });
      };
    };
  };
  var loadDeckSummaries = function(user) {
    return function(callback) {
      return function() {
        openDB().then((db) => {
          const tx = db.transaction(["decks", "deckMeta"], "readonly");
          const deckStore = tx.objectStore("decks");
          const metaStore = tx.objectStore("deckMeta");
          const deckReq = deckStore.getAll();
          deckReq.onsuccess = () => {
            const decks = deckReq.result.filter((d) => d.user === user);
            if (decks.length === 0) {
              callback([])();
              return;
            }
            let pending = decks.length;
            const results = new Array(decks.length);
            decks.forEach((deck, i) => {
              const id2 = deck.id;
              const metaReq = metaStore.get(id2);
              metaReq.onsuccess = () => {
                const meta = metaReq.result || { deckId: id2, title: "Untitled Deck", description: "", tags: [], sources: [] };
                results[i] = { id: id2, meta, cardCount: meta.cardCount || 0 };
                if (--pending === 0) callback(results)();
              };
            });
          };
        });
      };
    };
  };
  var createDeck = function(deckId) {
    return function(user) {
      return function(callback) {
        return function() {
          openDB().then((db) => {
            const tx = db.transaction(["decks", "deckMeta"], "readwrite");
            tx.objectStore("decks").put({ id: deckId, user });
            tx.objectStore("deckMeta").put({
              deckId,
              title: "Untitled Deck",
              description: "",
              tags: [],
              sources: []
            });
            tx.oncomplete = () => callback(deckId)();
          });
        };
      };
    };
  };
  var deleteDeck = function(deckId) {
    return function(callback) {
      return function() {
        openDB().then((db) => {
          const tx = db.transaction(["decks", "deckMeta"], "readwrite");
          tx.objectStore("decks").delete(deckId);
          tx.objectStore("deckMeta").delete(deckId);
          tx.oncomplete = () => {
            if (_deckDBs[deckId]) {
              _deckDBs[deckId].close();
              delete _deckDBs[deckId];
            }
            var delReq = indexedDB.deleteDatabase("umemo-deck-" + deckId);
            delReq.onsuccess = () => callback()();
            delReq.onerror = () => callback()();
          };
          tx.onerror = (e) => {
            console.error("deleteDeck transaction error:", e.target.error);
            callback()();
          };
        });
      };
    };
  };
  var getDeckMeta = function(deckId) {
    return function(callback) {
      return function() {
        openDB().then((db) => {
          const tx = db.transaction("deckMeta", "readonly");
          const req = tx.objectStore("deckMeta").get(deckId);
          req.onsuccess = () => {
            const r = req.result || { deckId, title: "", description: "", tags: [], sources: [] };
            callback(r)();
          };
        });
      };
    };
  };
  var setDeckMeta = function(deckId) {
    return function(metaJson) {
      return function() {
        openDB().then((db) => {
          const tx = db.transaction("deckMeta", "readwrite");
          const meta = Object.assign({}, metaJson, { deckId });
          tx.objectStore("deckMeta").put(meta);
        });
      };
    };
  };
  var getDeckFaces = function(deckId) {
    return function(callback) {
      return function() {
        openDeckDB(deckId).then((db) => {
          const tx = db.transaction("faces", "readonly");
          const idx = tx.objectStore("faces").index("position");
          const req = idx.getAll();
          req.onsuccess = () => {
            const faces = req.result.filter((f) => f.position !== null && f.position !== void 0).sort((a, b) => a.position - b.position).map((f) => Object.assign({ deckId }, f));
            callback(faces)();
          };
        });
      };
    };
  };
  var getCardFaces = function(deckId) {
    return function(cardId) {
      return function(callback) {
        return function() {
          openDeckDB(deckId).then((db) => {
            const tx = db.transaction("faces", "readonly");
            const idx = tx.objectStore("faces").index("cardId");
            const req = idx.getAll(cardId);
            req.onsuccess = () => {
              const results = req.result.map((f) => Object.assign({ deckId }, f));
              callback(results)();
            };
          });
        };
      };
    };
  };
  var getFrontCard = function(deckId) {
    return function(callback) {
      return function() {
        openDeckDB(deckId).then((db) => {
          const tx = db.transaction("faces", "readonly");
          const store = tx.objectStore("faces");
          const idx = store.index("position");
          const range3 = IDBKeyRange.lowerBound(0, true);
          const req = idx.openCursor(range3);
          req.onsuccess = () => {
            const cursor = req.result;
            if (cursor && (cursor.value.position === null || cursor.value.position === void 0)) {
              cursor.continue();
              return;
            }
            if (!cursor) {
              callback({ empty: true })();
              return;
            }
            const front = cursor.value;
            const cardId = front.cardId;
            const idx2 = store.index("cardId");
            const req2 = idx2.getAll(cardId);
            req2.onsuccess = () => {
              callback({
                empty: false,
                cardId,
                faces: req2.result.map((f) => Object.assign({ deckId }, f)),
                frontFaceId: front.faceId
              })();
            };
          };
        });
      };
    };
  };
  var saveFace = function(faceJson) {
    return function() {
      var deckId = faceJson.deckId || faceJson._deckId;
      openDeckDB(deckId).then((db) => {
        const tx = db.transaction("faces", "readwrite");
        const copy = Object.assign({}, faceJson);
        delete copy.deckId;
        tx.objectStore("faces").put(copy);
      });
    };
  };
  var saveFaces = function(facesJson) {
    return function() {
      if (facesJson.length === 0) return;
      var deckId = facesJson[0].deckId || facesJson[0]._deckId;
      openDeckDB(deckId).then((db) => {
        const tx = db.transaction("faces", "readwrite");
        const store = tx.objectStore("faces");
        for (const f of facesJson) {
          const copy = Object.assign({}, f);
          delete copy.deckId;
          store.put(copy);
        }
      });
    };
  };
  var saveFacesWithCallback = function(facesJson) {
    return function(callback) {
      return function() {
        if (facesJson.length === 0) {
          callback()();
          return;
        }
        var deckId = facesJson[0].deckId || facesJson[0]._deckId;
        openDeckDB(deckId).then((db) => {
          const tx = db.transaction("faces", "readwrite");
          const store = tx.objectStore("faces");
          for (const f of facesJson) {
            const copy = Object.assign({}, f);
            delete copy.deckId;
            store.put(copy);
          }
          tx.oncomplete = () => callback()();
        });
      };
    };
  };
  var deleteFace = function(deckId) {
    return function(faceId) {
      return function() {
        openDeckDB(deckId).then((db) => {
          const tx = db.transaction("faces", "readwrite");
          tx.objectStore("faces").delete(faceId);
        });
      };
    };
  };
  var getFaceById = function(deckId) {
    return function(faceId) {
      return function(callback) {
        return function() {
          openDeckDB(deckId).then((db) => {
            const tx = db.transaction("faces", "readonly");
            const req = tx.objectStore("faces").get(faceId);
            req.onsuccess = () => {
              const result = req.result ? Object.assign({ deckId }, req.result) : null;
              callback(result)();
            };
          });
        };
      };
    };
  };
  var insertCard = function(deckId) {
    return function(cardId) {
      return function(facesJson) {
        return function(position) {
          return function(callback) {
            return function() {
              openDeckDB(deckId).then((db) => {
                const tx = db.transaction("faces", "readwrite");
                const store = tx.objectStore("faces");
                for (let i = 0; i < facesJson.length; i++) {
                  const f = Object.assign({}, facesJson[i], {
                    cardId,
                    position: i === 0 ? position : null,
                    momentum: facesJson[i].momentum || 1
                  });
                  delete f.faceId;
                  delete f.deckId;
                  store.add(f);
                }
                tx.oncomplete = () => callback();
              });
            };
          };
        };
      };
    };
  };
  var exportAll = function(callback) {
    return function() {
      openDB().then(async (db) => {
        const tx = db.transaction(["decks", "deckMeta"], "readonly");
        const decksReq = tx.objectStore("decks").getAll();
        const metaReq = tx.objectStore("deckMeta").getAll();
        tx.oncomplete = async () => {
          const decks = {};
          for (const d of decksReq.result) {
            decks[d.id] = [d.user];
          }
          const faces = {};
          for (const d of decksReq.result) {
            try {
              const deckDB = await openDeckDB(d.id);
              const allFaces = await new Promise((resolve) => {
                const ftx = deckDB.transaction("faces", "readonly");
                const req = ftx.objectStore("faces").getAll();
                req.onsuccess = () => resolve(req.result || []);
              });
              for (const f of allFaces) {
                var key = d.id + ":" + f.faceId;
                faces[key] = [d.id, f.cardId, JSON.stringify(f.contents), f.position, f.momentum];
              }
            } catch (e) {
            }
          }
          const deckMeta = {};
          for (const m of metaReq.result) {
            deckMeta[m.deckId] = {
              title: m.title || "",
              description: m.description || "",
              tags: m.tags || []
            };
          }
          callback({ decks, faces, deck_meta: deckMeta })();
        };
      });
    };
  };
  var importAll = function(jsonData) {
    return function(callback) {
      return function() {
        openDB().then(async (db) => {
          const tx = db.transaction(["decks", "deckMeta"], "readwrite");
          const deckStore = tx.objectStore("decks");
          const metaStore = tx.objectStore("deckMeta");
          const decks = jsonData.decks || {};
          for (const [id2, vals] of Object.entries(decks)) {
            deckStore.put({ id: id2, user: vals[0] });
          }
          const deckMeta = jsonData.deck_meta || {};
          for (const [deckId, meta] of Object.entries(deckMeta)) {
            metaStore.put({
              deckId,
              title: meta.title || "",
              description: meta.description || "",
              tags: meta.tags || [],
              sources: meta.sources || []
            });
          }
          const facesByDeck = {};
          const faces = jsonData.faces || {};
          for (const [rowid, vals] of Object.entries(faces)) {
            const deckId = vals[0];
            if (!facesByDeck[deckId]) facesByDeck[deckId] = [];
            const contents = typeof vals[2] === "string" ? JSON.parse(vals[2]) : vals[2];
            facesByDeck[deckId].push({
              cardId: vals[1],
              contents,
              position: vals[3],
              momentum: vals[4] || 1,
              externalSource: null,
              externalId: null
            });
          }
          await new Promise((resolve) => {
            tx.oncomplete = resolve;
          });
          for (const [deckId, deckFaces] of Object.entries(facesByDeck)) {
            const deckDB = await openDeckDB(deckId);
            await new Promise((resolve) => {
              const ftx = deckDB.transaction("faces", "readwrite");
              const store = ftx.objectStore("faces");
              for (const f of deckFaces) {
                store.add(f);
              }
              ftx.oncomplete = resolve;
            });
          }
          callback()();
        });
      };
    };
  };
  var loadSettings = function(callback) {
    return function() {
      openDB().then((db) => {
        const tx = db.transaction("settings", "readonly");
        const req = tx.objectStore("settings").get("default");
        req.onsuccess = () => {
          const r = req.result || {
            key: "default",
            learningRate: 2,
            defaultFacePriority: 1,
            defaultLinkSiblings: true
          };
          callback(r)();
        };
      });
    };
  };
  var saveSettings = function(settingsJson) {
    return function() {
      openDB().then((db) => {
        const tx = db.transaction("settings", "readwrite");
        const data = Object.assign({}, settingsJson, { key: "default" });
        tx.objectStore("settings").put(data);
      });
    };
  };
  var sha256Hex16 = function(input) {
    return function(callback) {
      return function() {
        crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)).then((buf) => {
          const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
          callback(hex.substring(0, 16))();
        });
      };
    };
  };
  var fetchUrl = function(url) {
    return function(onSuccess) {
      return function(onError) {
        return function() {
          fetch(url).then((r) => {
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.text();
          }).then((text) => onSuccess(text)()).catch((e) => onError(e.message)());
        };
      };
    };
  };
  var getDeckCardCount = function(deckId) {
    return function(callback) {
      return function() {
        openDeckDB(deckId).then((db) => {
          const tx = db.transaction("faces", "readonly");
          const idx = tx.objectStore("faces").index("cardId");
          const req = idx.openKeyCursor(null, "nextunique");
          var count = 0;
          req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
              count++;
              cursor.continue();
            } else {
              callback(count)();
            }
          };
        });
      };
    };
  };
  var getCardList = function(deckId) {
    return function(offset) {
      return function(pageSize2) {
        return function(callback) {
          return function() {
            openDeckDB(deckId).then((db) => {
              const tx = db.transaction("faces", "readonly");
              const idx = tx.objectStore("faces").index("position");
              const range3 = IDBKeyRange.lowerBound(-Infinity);
              const req = idx.openCursor(range3);
              const seenCards = /* @__PURE__ */ new Set();
              const pageCardIds = [];
              const pageFaces = {};
              let collecting = false;
              req.onsuccess = () => {
                const cursor = req.result;
                if (!cursor) {
                  _fetchUnpositionedFaces(db, pageCardIds, pageFaces, callback);
                  return;
                }
                const f = cursor.value;
                if (f.position === null || f.position === void 0) {
                  cursor.continue();
                  return;
                }
                const cid = f.cardId;
                if (!seenCards.has(cid)) {
                  seenCards.add(cid);
                  if (seenCards.size > offset && seenCards.size <= offset + pageSize2) {
                    collecting = true;
                    pageCardIds.push(cid);
                  } else if (seenCards.size > offset + pageSize2) {
                    _fetchUnpositionedFaces(db, pageCardIds, pageFaces, callback);
                    return;
                  }
                }
                if (collecting && pageCardIds.indexOf(cid) !== -1) {
                  if (!pageFaces[cid]) pageFaces[cid] = [];
                  pageFaces[cid].push(f);
                }
                cursor.continue();
              };
            });
          };
        };
      };
    };
  };
  function _fetchUnpositionedFaces(db, cardIds, pageFaces, callback) {
    if (cardIds.length === 0) {
      callback([])();
      return;
    }
    const tx = db.transaction("faces", "readonly");
    const idx = tx.objectStore("faces").index("cardId");
    var pending = cardIds.length;
    for (const cid of cardIds) {
      const req = idx.getAll(cid);
      req.onsuccess = () => {
        for (const f of req.result) {
          if (f.position === null || f.position === void 0) {
            if (!pageFaces[cid]) pageFaces[cid] = [];
            if (!pageFaces[cid].some((x) => x.faceId === f.faceId)) {
              pageFaces[cid].push(f);
            }
          }
        }
        pending--;
        if (pending === 0) {
          const cards = cardIds.map((cid2) => {
            const faces = (pageFaces[cid2] || []).sort((a, b) => (a.faceId || 0) - (b.faceId || 0));
            return { cardId: cid2, faces };
          });
          callback(cards)();
        }
      };
    }
  }
  var randomUUID = function(callback) {
    return function() {
      const uuid = crypto.randomUUID().replace(/-/g, "");
      callback(uuid)();
    };
  };
  var randomFloat = function(callback) {
    return function() {
      callback(Math.random())();
    };
  };
  var randomUint32 = function(callback) {
    return function() {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      callback(arr[0] & 2147483647)();
    };
  };
  var getPositionsAroundRank = function(deckId) {
    return function(rank) {
      return function(callback) {
        return function() {
          openDeckDB(deckId).then((db) => {
            const tx = db.transaction("faces", "readonly");
            const idx = tx.objectStore("faces").index("position");
            const range3 = IDBKeyRange.lowerBound(0, true);
            const countReq = idx.count(range3);
            countReq.onsuccess = () => {
              const total = countReq.result;
              if (total === 0) {
                callback({
                  posAtRank: null,
                  posAfterRank: null,
                  firstPos: null,
                  lastPos: null,
                  total: 0
                })();
                return;
              }
              const curReq = idx.openCursor(range3);
              var i = 0;
              var posAtRank = null;
              var posAfterRank = null;
              var firstPos = null;
              var lastPos = null;
              var needLast = rank < 0 || rank >= total - 1;
              curReq.onsuccess = () => {
                const cursor = curReq.result;
                if (cursor) {
                  const pos = cursor.value.position;
                  if (pos === null || pos === void 0) {
                    cursor.continue();
                    return;
                  }
                  if (i === 0) firstPos = pos;
                  lastPos = pos;
                  if (i === rank) posAtRank = pos;
                  if (i === rank + 1) posAfterRank = pos;
                  i++;
                  if (i > rank + 1 && !needLast) {
                    callback({
                      posAtRank,
                      posAfterRank,
                      firstPos,
                      lastPos,
                      total
                    })();
                  } else {
                    cursor.continue();
                  }
                } else {
                  callback({
                    posAtRank,
                    posAfterRank,
                    firstPos,
                    lastPos,
                    total
                  })();
                }
              };
            };
          });
        };
      };
    };
  };
  var _specCache = null;
  var speculativePrefetch = function(deckId) {
    return function() {
      _specCache = null;
      openDeckDB(deckId).then((db) => {
        const tx = db.transaction("faces", "readonly");
        const store = tx.objectStore("faces");
        const idx = store.index("position");
        const range3 = IDBKeyRange.lowerBound(0, true);
        const req = idx.openCursor(range3);
        var count = 0;
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) return;
          if (cursor.value.position === null || cursor.value.position === void 0) {
            cursor.continue();
            return;
          }
          count++;
          if (count < 2) {
            cursor.continue();
            return;
          }
          const face = cursor.value;
          const cardId = face.cardId;
          const idx2 = store.index("cardId");
          const req2 = idx2.getAll(cardId);
          req2.onsuccess = () => {
            _specCache = {
              deckId,
              cardId,
              faces: req2.result.map((f) => Object.assign({ deckId }, f)),
              frontFaceId: face.faceId
            };
          };
        };
      });
    };
  };
  var getFrontCardSpeculative = function(deckId) {
    return function(callback) {
      return function() {
        openDeckDB(deckId).then((db) => {
          const tx = db.transaction("faces", "readonly");
          const store = tx.objectStore("faces");
          const idx = store.index("position");
          const range3 = IDBKeyRange.lowerBound(0, true);
          const req = idx.openCursor(range3);
          req.onsuccess = () => {
            const cursor = req.result;
            if (!cursor || cursor.value.position === null || cursor.value.position === void 0) {
              if (cursor) {
                cursor.continue();
                return;
              }
              _specCache = null;
              callback({ empty: true })();
              return;
            }
            const front = cursor.value;
            const cardId = front.cardId;
            if (_specCache && _specCache.deckId === deckId && _specCache.cardId === cardId) {
              var result = {
                empty: false,
                cardId,
                faces: _specCache.faces,
                frontFaceId: front.faceId
              };
              _specCache = null;
              callback(result)();
            } else {
              _specCache = null;
              const idx2 = store.index("cardId");
              const req2 = idx2.getAll(cardId);
              req2.onsuccess = () => {
                callback({
                  empty: false,
                  cardId,
                  faces: req2.result.map((f) => Object.assign({ deckId }, f)),
                  frontFaceId: front.faceId
                })();
              };
            }
          };
        });
      };
    };
  };
  var needsRebalance = function(deckId) {
    return function(callback) {
      return function() {
        openDeckDB(deckId).then((db) => {
          const tx = db.transaction("faces", "readonly");
          const idx = tx.objectStore("faces").index("position");
          const range3 = IDBKeyRange.lowerBound(0, true);
          const req = idx.openCursor(range3);
          var prevPos = null;
          req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
              var pos = cursor.value.position;
              if (pos !== null && pos !== void 0) {
                if (prevPos !== null && pos - prevPos < 1) {
                  callback(true)();
                  return;
                }
                prevPos = pos;
              }
              cursor.continue();
            } else {
              callback(false)();
            }
          };
        });
      };
    };
  };
  var rebalanceDeck = function(deckId) {
    return function(callback) {
      return function() {
        openDeckDB(deckId).then((db) => {
          const countTx = db.transaction("faces", "readonly");
          const countIdx = countTx.objectStore("faces").index("position");
          const range3 = IDBKeyRange.lowerBound(0, true);
          const countReq = countIdx.count(range3);
          countReq.onsuccess = () => {
            const N = countReq.result;
            if (N === 0) {
              callback();
              return;
            }
            const PRIORITY_MAX = 2147483647;
            const delta = PRIORITY_MAX / (N + 1);
            const tx = db.transaction("faces", "readwrite");
            const store = tx.objectStore("faces");
            const idx = store.index("position");
            const req = idx.openCursor(range3);
            var i = 0;
            req.onsuccess = () => {
              const cursor = req.result;
              if (cursor) {
                if (cursor.value.position !== null && cursor.value.position !== void 0) {
                  const face = cursor.value;
                  face.position = delta * (i + 1);
                  cursor.update(face);
                  i++;
                }
                cursor.continue();
              }
            };
            tx.oncomplete = () => callback();
          };
        });
      };
    };
  };
  var registerPortModule = function() {
    window._portModule = {
      initDB,
      listDecks,
      createDeck,
      deleteDeck,
      getDeckMeta,
      setDeckMeta,
      getDeckFaces,
      getCardFaces,
      getFrontCard,
      saveFace,
      saveFaces,
      saveFacesWithCallback,
      deleteFace,
      getFaceById,
      insertCard,
      exportAll,
      importAll,
      loadSettings,
      saveSettings,
      sha256Hex16,
      fetchUrl,
      getDeckCardCount,
      getCardList,
      randomUUID,
      randomFloat,
      randomUint32,
      rebalanceDeck,
      getPositionsAroundRank,
      speculativePrefetch,
      getFrontCardSpeculative,
      needsRebalance
    };
  };

  // output/Route/index.js
  var Home = /* @__PURE__ */ (function() {
    function Home2() {
    }
    ;
    Home2.value = new Home2();
    return Home2;
  })();
  var Play = /* @__PURE__ */ (function() {
    function Play2(value0) {
      this.value0 = value0;
    }
    ;
    Play2.create = function(value0) {
      return new Play2(value0);
    };
    return Play2;
  })();
  var ViewDeck = /* @__PURE__ */ (function() {
    function ViewDeck2(value0) {
      this.value0 = value0;
    }
    ;
    ViewDeck2.create = function(value0) {
      return new ViewDeck2(value0);
    };
    return ViewDeck2;
  })();
  var EditDeck = /* @__PURE__ */ (function() {
    function EditDeck2(value0) {
      this.value0 = value0;
    }
    ;
    EditDeck2.create = function(value0) {
      return new EditDeck2(value0);
    };
    return EditDeck2;
  })();
  var ImportSheet = /* @__PURE__ */ (function() {
    function ImportSheet2(value0) {
      this.value0 = value0;
    }
    ;
    ImportSheet2.create = function(value0) {
      return new ImportSheet2(value0);
    };
    return ImportSheet2;
  })();
  var SettingsRoute = /* @__PURE__ */ (function() {
    function SettingsRoute2() {
    }
    ;
    SettingsRoute2.value = new SettingsRoute2();
    return SettingsRoute2;
  })();
  var RestoreBackup = /* @__PURE__ */ (function() {
    function RestoreBackup2() {
    }
    ;
    RestoreBackup2.value = new RestoreBackup2();
    return RestoreBackup2;
  })();
  var routeToHash = function(v) {
    if (v instanceof Home) {
      return "#/";
    }
    ;
    if (v instanceof Play) {
      return "#/play/" + v.value0;
    }
    ;
    if (v instanceof ViewDeck) {
      return "#/view/" + v.value0;
    }
    ;
    if (v instanceof EditDeck) {
      return "#/edit/" + v.value0;
    }
    ;
    if (v instanceof ImportSheet) {
      return "#/import/" + v.value0;
    }
    ;
    if (v instanceof SettingsRoute) {
      return "#/settings";
    }
    ;
    if (v instanceof RestoreBackup) {
      return "#/restore";
    }
    ;
    throw new Error("Failed pattern match at Route (line 40, column 1 - line 40, column 31): " + [v.constructor.name]);
  };
  var parseRoute = function(hash) {
    var path = (function() {
      var v = indexOf2("#")(hash);
      if (v instanceof Just && v.value0 === 0) {
        return drop4(1)(hash);
      }
      ;
      return hash;
    })();
    var parts = split("/")(path);
    if (parts.length === 3 && (parts[0] === "" && parts[1] === "play")) {
      return new Play(parts[2]);
    }
    ;
    if (parts.length === 3 && (parts[0] === "" && parts[1] === "view")) {
      return new ViewDeck(parts[2]);
    }
    ;
    if (parts.length === 3 && (parts[0] === "" && parts[1] === "edit")) {
      return new EditDeck(parts[2]);
    }
    ;
    if (parts.length === 3 && (parts[0] === "" && parts[1] === "import")) {
      return new ImportSheet(parts[2]);
    }
    ;
    if (parts.length === 2 && (parts[0] === "" && parts[1] === "settings")) {
      return SettingsRoute.value;
    }
    ;
    if (parts.length === 2 && (parts[0] === "" && parts[1] === "restore")) {
      return RestoreBackup.value;
    }
    ;
    return Home.value;
  };

  // output/Main/index.js
  var show2 = /* @__PURE__ */ show(showInt);
  var foldl2 = /* @__PURE__ */ foldl(foldableArray);
  var show1 = /* @__PURE__ */ show(showNumber);
  var show22 = /* @__PURE__ */ show(showBoolean);
  var pure4 = /* @__PURE__ */ pure(applicativeEffect);
  var decodeJson3 = /* @__PURE__ */ decodeJson(/* @__PURE__ */ decodeForeignObject2(decodeJsonJson));
  var bind1 = /* @__PURE__ */ bind(bindEither);
  var getField4 = /* @__PURE__ */ getField2(decodeJsonInt);
  var getField1 = /* @__PURE__ */ getField2(decodeJsonJson);
  var pure1 = /* @__PURE__ */ pure(applicativeEither);
  var getField22 = /* @__PURE__ */ getField2(/* @__PURE__ */ decodeArray2(decodeJsonJson));
  var div3 = /* @__PURE__ */ div(euclideanRingInt);
  var getField32 = /* @__PURE__ */ getField2(decodeJsonNumber);
  var getField42 = /* @__PURE__ */ getField2(decodeJsonBoolean);
  var getFieldOptional$prime4 = /* @__PURE__ */ getFieldOptional$prime2(decodeJsonBoolean);
  var getField5 = /* @__PURE__ */ getField2(decodeJsonString);
  var map6 = /* @__PURE__ */ map(functorEither);
  var getFieldOptional$prime12 = /* @__PURE__ */ getFieldOptional$prime2(decodeJsonString);
  var getFieldOptional$prime23 = /* @__PURE__ */ getFieldOptional$prime2(/* @__PURE__ */ decodeArray2(decodeJsonString));
  var showAnswer = function __do() {
    addClassById("card-container")("answer")();
    return addClassById("play-card-buttons")("answer")();
  };
  var renderRestorePage = function(model) {
    return function __do3() {
      setInnerHTML("app")('\n    <main class="container">\n      <div class="page-nav">\n        <a href="#/" class="nav-link">\u2190 Home</a>\n      </div>\n      <h1>\u2B06 Restore Backup</h1>\n      <p>Upload a previously exported umemo JSON backup file.</p>\n      <form onsubmit="event.preventDefault(); window._restoreBackup()">\n        <input id="restore-file" type="file" accept=".json,application/json">\n        <button type="submit">Import</button>\n      </form>\n    </main>\n  ')();
      return setGlobal("_restoreBackup")(restoreBackupFromJs(model))();
    };
  };
  var renderPaginationControls = function(currentPage) {
    return function(totalPages) {
      var prevPage = (function() {
        var $60 = currentPage > 0;
        if ($60) {
          return currentPage - 1 | 0;
        }
        ;
        return 0;
      })();
      var prevDisabled = (function() {
        var $61 = currentPage <= 0;
        if ($61) {
          return " disabled";
        }
        ;
        return "";
      })();
      var nextPage = (function() {
        var $62 = currentPage < (totalPages - 1 | 0);
        if ($62) {
          return currentPage + 1 | 0;
        }
        ;
        return currentPage;
      })();
      var nextDisabled = (function() {
        var $63 = currentPage >= (totalPages - 1 | 0);
        if ($63) {
          return " disabled";
        }
        ;
        return "";
      })();
      return '<button class="pagination-btn" onclick="window._goToCardPage(' + (show2(prevPage) + (')""' + (prevDisabled + (">\u2190 Prev</button>" + (' <span class="pagination-info">Page ' + (show2(currentPage + 1 | 0) + (" of " + (show2(totalPages) + ("</span> " + ('<button class="pagination-btn" onclick="window._goToCardPage(' + (show2(nextPage) + (')""' + (nextDisabled + ">Next \u2192</button>")))))))))))));
    };
  };
  var renderNewCardButton = function(v) {
    return function(v1) {
      if (!v) {
        return "";
      }
      ;
      if (v) {
        return '\n  <button class="btn-primary" onclick="window._newCard()">+ New Card</button>\n';
      }
      ;
      throw new Error("Failed pattern match at Main (line 531, column 1 - line 531, column 51): " + [v.constructor.name, v1.constructor.name]);
    };
  };
  var renderMetaForm = function(_deckId) {
    return function(meta) {
      return function(syncResult) {
        var tagsStr = foldl2(function(acc) {
          return function(t) {
            var $66 = acc === "";
            if ($66) {
              return t;
            }
            ;
            return acc + (", " + t);
          };
        })("")(meta.tags);
        var syncMsg = (function() {
          if (syncResult instanceof Just) {
            return '<p class="sync-result">' + (escapeHtml(syncResult.value0) + "</p>");
          }
          ;
          if (syncResult instanceof Nothing) {
            return "";
          }
          ;
          throw new Error("Failed pattern match at Main (line 624, column 15 - line 626, column 20): " + [syncResult.constructor.name]);
        })();
        var syncBtn = (function() {
          var $69 = $$null(meta.sources);
          if ($69) {
            return "";
          }
          ;
          return '<button class="sync-button" onclick="window._syncSources()">Sync (' + (show2(length(meta.sources)) + " sources)</button>");
        })();
        var sourceItems = foldl2(function(acc) {
          return function(s) {
            return acc + ("<li><code>" + (escapeHtml(s) + (`</code> <button class="source-remove" onclick="window._removeSource('` + (escapeHtml(s) + `')">\u2715</button></li>`))));
          };
        })("")(meta.sources);
        var sourcesHtml = (function() {
          var $70 = $$null(meta.sources);
          if ($70) {
            return "<p>No sources configured.</p>";
          }
          ;
          return "<ul>" + (sourceItems + "</ul>");
        })();
        return '<div id="deck-meta-form" class="deck-meta-form">' + (syncMsg + ('<form onsubmit="event.preventDefault(); window._saveMeta()">' + ('<div><label for="deck-title">Title</label>' + ('<input name="title" id="deck-title" value="' + (escapeHtml(meta.title) + ('" placeholder="Deck title"></div>' + ('<div><label for="deck-desc">Description</label>' + ('<textarea name="description" id="deck-desc" placeholder="Deck description" rows="2">' + (escapeHtml(meta.description) + ("</textarea></div>" + ('<div><label for="deck-tags">Tags</label>' + ('<input name="tags" id="deck-tags" value="' + (escapeHtml(tagsStr) + ('" placeholder="Comma-separated tags"></div>' + ('<button type="submit">Save</button>' + ("</form>" + ('<div class="deck-sources">' + ("<h3>Sources</h3>" + (sourcesHtml + ('<form onsubmit="event.preventDefault(); window._addSource()">' + ('<input id="source-url-input" type="url" placeholder="https://docs.google.com/spreadsheets/d/...">' + ('<button type="submit">Add source</button>' + ("</form>" + (syncBtn + "</div></div>"))))))))))))))))))))))));
      };
    };
  };
  var renderImportPage = function(_model) {
    return function(deckId) {
      return function(meta) {
        return function(result) {
          var title = (function() {
            var $71 = meta.title === "";
            if ($71) {
              return "Untitled Deck";
            }
            ;
            return meta.title;
          })();
          var resultHtml = (function() {
            if (result instanceof Just) {
              return '<p class="import-success">' + (escapeHtml(result.value0) + "</p>");
            }
            ;
            if (result instanceof Nothing) {
              return "";
            }
            ;
            throw new Error("Failed pattern match at Main (line 672, column 20 - line 674, column 22): " + [result.constructor.name]);
          })();
          return function __do3() {
            setInnerHTML("app")('\n    <main class="container">\n      <div class="page-nav">\n        <a href="#/" class="nav-link">\u2190 Home</a>\n        <a href="#/edit/' + (deckId + ('" class="nav-link">\u270E Edit deck</a>\n      </div>\n      <h1>Import to: ' + (escapeHtml(title) + ("</h1>\n      " + (resultHtml + '\n      <div class="import-help">\n        <p>Import cards from a Google Sheet (published as CSV) or upload a CSV file.</p>\n        <p>Each row becomes one card. Each non-empty cell becomes a face.\n           Prefix cells with <code>img:</code>, <code>audio:</code>, or <code>md:</code> to set the face type.</p>\n      </div>\n      <form onsubmit="event.preventDefault(); window._importSheet()">\n        <fieldset>\n          <legend>Google Sheet URL</legend>\n          <input id="import-sheet-url" type="url" placeholder="https://docs.google.com/spreadsheets/d/...">\n        </fieldset>\n        <fieldset>\n          <legend>Or upload CSV</legend>\n          <input id="import-csv-file" type="file" accept=".csv,text/csv">\n        </fieldset>\n        <button type="submit">Import</button>\n      </form>\n    </main>\n  '))))))();
            return registerImportHandler(deckId)();
          };
        };
      };
    };
  };
  var renderFaceGuts = function(face) {
    return function(fid) {
      return function(_deckId) {
        return '\n  <ul class="face-guts">\n    <li>Priority: ' + (show1(face.priority) + ("</li>\n    <li>Momentum: " + (show1(face.momentum) + ("</li>\n    <li>Linked: " + (show22(face.linkSiblings) + ('</li>\n  </ul>\n  <button class="face-delete" onclick="window._deleteFace(' + (show2(fid) + ')">Delete</button>')))))));
      };
    };
  };
  var renderFaceContentEditable = function(face) {
    return function(editable) {
      return function(fid) {
        if (face.faceType instanceof TextFace) {
          if (editable) {
            return '<p class="face-text editable" contenteditable="plaintext-only" onblur="window._saveFace(' + (show2(fid) + (`,this.textContent,'TextFace')">` + (escapeHtml(face.faceType.value0.text) + "</p>")));
          }
          ;
          return '<p class="face-text">' + (escapeHtml(face.faceType.value0.text) + "</p>");
        }
        ;
        if (face.faceType instanceof MarkdownFace) {
          if (editable) {
            return '<div class="face-markdown"><textarea class="face-markdown-edit" rows="4" onblur="window._saveFace(' + (show2(fid) + (`,this.value,'MarkdownFace')">` + (escapeHtml(face.faceType.value0.text) + "</textarea></div>")));
          }
          ;
          return '<div class="face-text face-markdown">' + (face.faceType.value0.text + "</div>");
        }
        ;
        if (face.faceType instanceof ImageFace) {
          if (editable) {
            return '<div class="face-image-edit">' + ('<input type="url" value="' + (escapeHtml(face.faceType.value0.src) + ('" placeholder="Image URL" onblur="window._saveFace(' + (show2(fid) + (`,this.value,'ImageFace_src')">` + ('<input type="text" value="' + (escapeHtml(face.faceType.value0.alt) + ('" placeholder="Alt text" onblur="window._saveFace(' + (show2(fid) + (`,this.value,'ImageFace_alt')">` + ((function() {
              var $80 = face.faceType.value0.src !== "";
              if ($80) {
                return '<img src="' + (escapeHtml(face.faceType.value0.src) + '" class="face-image">');
              }
              ;
              return "";
            })() + "</div>")))))))))));
          }
          ;
          var $81 = face.faceType.value0.src === "";
          if ($81) {
            return '<p class="face-text">(no image)</p>';
          }
          ;
          return '<div class="face-text"><img src="' + (escapeHtml(face.faceType.value0.src) + ('" alt="' + (escapeHtml(face.faceType.value0.alt) + '" class="face-image"></div>')));
        }
        ;
        if (face.faceType instanceof AudioFace) {
          if (editable) {
            return '<div class="face-audio-edit">' + ('<input type="url" value="' + (escapeHtml(face.faceType.value0.src) + ('" placeholder="Audio URL" onblur="window._saveFace(' + (show2(fid) + (`,this.value,'AudioFace_src')">` + ('<input type="text" value="' + (escapeHtml(face.faceType.value0.label) + ('" placeholder="Label" onblur="window._saveFace(' + (show2(fid) + (`,this.value,'AudioFace_label')">` + ((function() {
              var $84 = face.faceType.value0.src !== "";
              if ($84) {
                return '<audio controls class="face-audio"><source src="' + (escapeHtml(face.faceType.value0.src) + '"></audio>');
              }
              ;
              return "";
            })() + "</div>")))))))))));
          }
          ;
          var labelHtml = (function() {
            var $85 = face.faceType.value0.label === "";
            if ($85) {
              return "";
            }
            ;
            return "<p>" + (escapeHtml(face.faceType.value0.label) + "</p>");
          })();
          var $86 = face.faceType.value0.src === "";
          if ($86) {
            return '<p class="face-text">(no audio)</p>';
          }
          ;
          return '<div class="face-text">' + (labelHtml + ('<audio controls preload="metadata" class="face-audio"><source src="' + (escapeHtml(face.faceType.value0.src) + '"></audio></div>')));
        }
        ;
        throw new Error("Failed pattern match at Main (line 581, column 47 - line 610, column 176): " + [face.faceType.constructor.name]);
      };
    };
  };
  var renderFaceContent = function(face) {
    if (face.faceType instanceof TextFace) {
      return '<p class="face-text">' + (escapeHtml(face.faceType.value0.text) + "</p>");
    }
    ;
    if (face.faceType instanceof MarkdownFace) {
      return '<div class="face-text face-markdown">' + (face.faceType.value0.text + "</div>");
    }
    ;
    if (face.faceType instanceof ImageFace) {
      var $91 = face.faceType.value0.src === "";
      if ($91) {
        return '<p class="face-text">(no image)</p>';
      }
      ;
      return '<div class="face-text"><img src="' + (escapeHtml(face.faceType.value0.src) + ('" alt="' + (escapeHtml(face.faceType.value0.alt) + '" class="face-image"></div>')));
    }
    ;
    if (face.faceType instanceof AudioFace) {
      var labelHtml = (function() {
        var $93 = face.faceType.value0.label === "";
        if ($93) {
          return "";
        }
        ;
        return "<p>" + (escapeHtml(face.faceType.value0.label) + "</p>");
      })();
      var $94 = face.faceType.value0.src === "";
      if ($94) {
        return '<p class="face-text">(no audio)</p>';
      }
      ;
      return '<div class="face-text">' + (labelHtml + ('<audio controls preload="metadata" class="face-audio"><source src="' + (escapeHtml(face.faceType.value0.src) + '"></audio></div>')));
    }
    ;
    throw new Error("Failed pattern match at Main (line 455, column 26 - line 464, column 174): " + [face.faceType.constructor.name]);
  };
  var renderFaceHtml = function(face) {
    return function(isPrompt) {
      var idAttr = (function() {
        if (isPrompt) {
          return ' id="answer-face"';
        }
        ;
        return "";
      })();
      var content = renderFaceContent(face);
      return '<div class="' + ("face play-face" + ('"' + (idAttr + (">" + (content + "</div>")))));
    };
  };
  var renderCardHead = function(_deckId) {
    return function(cardId) {
      return `
  <div class="card-head">
    <button onclick="window._addFace('text',` + (show2(cardId) + (`)">Text</button>
    <button onclick="window._addFace('markdown',` + (show2(cardId) + (`)">Markdown</button>
    <button onclick="window._addFace('image',` + (show2(cardId) + (`)">Image</button>
    <button onclick="window._addFace('audio',` + (show2(cardId) + ')">Audio</button>\n  </div>')))))));
    };
  };
  var playKeyboard = function(key) {
    return function(answerShown) {
      var $97 = !answerShown;
      if ($97) {
        if (key === " ") {
          return showAnswer;
        }
        ;
        if (key === "Enter") {
          return showAnswer;
        }
        ;
        return pure4(unit);
      }
      ;
      if (key === "1") {
        return callGlobal("_vote")(-1 | 0);
      }
      ;
      if (key === "2") {
        return callGlobal("_vote")(0);
      }
      ;
      if (key === "3") {
        return callGlobal("_vote")(1);
      }
      ;
      return pure4(unit);
    };
  };
  var renderPlayPage = function(model) {
    return function(ps) {
      return function __do3() {
        var connected = isDriveConnected();
        var title = (function() {
          var $100 = ps.deckTitle === "";
          if ($100) {
            return "Untitled Deck";
          }
          ;
          return ps.deckTitle;
        })();
        var syncDot = (function() {
          if (connected) {
            return '<span class="sync-dot-wrap"><span class="sync-dot" id="play-sync-dot"></span><span class="sync-popover sync-popover--play" id="play-sync-popover"></span></span>';
          }
          ;
          return "";
        })();
        var frontHtml = (function() {
          if (ps.frontFace instanceof Nothing) {
            return '<div class="play-face"><p class="face-text">No cards in this deck</p></div>';
          }
          ;
          if (ps.frontFace instanceof Just) {
            return renderFaceHtml(ps.frontFace.value0.face)(true);
          }
          ;
          throw new Error("Failed pattern match at Main (line 384, column 19 - line 386, column 45): " + [ps.frontFace.constructor.name]);
        })();
        var backsHtml = foldl2(function(acc) {
          return function(f) {
            return acc + renderFaceHtml(f.face)(false);
          };
        })("")(ps.backFaces);
        setInnerHTML("app")('\n    <main>\n      <div class="play-header">\n        <a href="#/" class="play-nav-link">\u2190</a>\n        <span class="play-deck-title">' + (escapeHtml(title) + ('</span>\n        <span class="play-header-right">' + (syncDot + ('<a href="#/edit/' + (ps.deckId + ('" class="play-nav-link">\u270E</a></span>\n      </div>\n      <div id="play-card-area">\n        <div id="play-card-inner">\n          <div id="card-container">\n            ' + (frontHtml + (backsHtml + '\n          </div>\n          <div id="play-card-buttons">\n            <span id="play-query-buttons">\n              <button id="bad-vote-button" onclick="window._vote(-1)">Bad<span class="key-hint">(1)</span></button>\n              <button id="mid-vote-button" onclick="window._vote(0)">Neutral<span class="key-hint">(2)</span></button>\n              <button id="good-vote-button" onclick="window._vote(1)">Good<span class="key-hint">(3)</span></button>\n            </span>\n            <div id="play-show-buttons">\n              <button id="play-show-button" onclick="window._showAnswer()">Show</button>\n            </div>\n          </div>\n        </div>\n      </div>\n    </main>\n  ')))))))))();
        setGlobal("_showAnswer")(showAnswer)();
        registerVoteHandler(model)(ps)();
        addKeyboardListener(playKeyboard)();
        return initPlaySyncPopover();
      };
    };
  };
  var pageSize = 50;
  var newDeck = function(model) {
    return randomUUID(function(deckId) {
      return createDeck(deckId)(model.user)(function(v) {
        return setLocationHash(routeToHash(new EditDeck(deckId)));
      });
    });
  };
  var initialModel = /* @__PURE__ */ (function() {
    return {
      route: Home.value,
      user: "default",
      settings: defaultSettings,
      decks: [],
      play: Nothing.value,
      edit: Nothing.value,
      viewMode: false,
      importState: Nothing.value,
      settingsForm: Nothing.value,
      restoreResult: Nothing.value
    };
  })();
  var findFaceById = function(fid) {
    return function(arr) {
      return head(filter(function(f) {
        return f.faceId === fid;
      })(arr));
    };
  };
  var exportBackup = function(v) {
    return exportAll(function(json) {
      return downloadJson(stringify(json))("umemo_backup.json");
    });
  };
  var driveFullSync = function(model) {
    return startBackgroundSync(model);
  };
  var decodeSingleStoredFace = function(json) {
    var v = decodeJson3(json);
    if (v instanceof Right) {
      var v1 = bind1(getField4(v.value0)("faceId"))(function(faceId) {
        return bind1(getField1(v.value0)("contents"))(function(contents) {
          return pure1({
            faceId,
            contents
          });
        });
      });
      if (v1 instanceof Right) {
        var v2 = decodeFaceFromJson(v1.value0.contents);
        if (v2 instanceof Right) {
          return new Just({
            face: v2.value0,
            faceId: v1.value0.faceId
          });
        }
        ;
        if (v2 instanceof Left) {
          return Nothing.value;
        }
        ;
        throw new Error("Failed pattern match at Main (line 370, column 16 - line 372, column 24): " + [v2.constructor.name]);
      }
      ;
      if (v1 instanceof Left) {
        return Nothing.value;
      }
      ;
      throw new Error("Failed pattern match at Main (line 365, column 16 - line 373, column 22): " + [v1.constructor.name]);
    }
    ;
    if (v instanceof Left) {
      return Nothing.value;
    }
    ;
    throw new Error("Failed pattern match at Main (line 364, column 31 - line 374, column 20): " + [v.constructor.name]);
  };
  var renderStoredFaceHtml = function(json) {
    return function(editable) {
      return function(deckId) {
        var v = decodeSingleStoredFace(json);
        if (v instanceof Just) {
          var guts = (function() {
            if (editable) {
              return renderFaceGuts(v.value0.face)(v.value0.faceId)(deckId);
            }
            ;
            return "";
          })();
          var content = renderFaceContentEditable(v.value0.face)(editable)(v.value0.faceId);
          return '<div class="face" data-face-id="' + (show2(v.value0.faceId) + ('">' + (content + (guts + "</div>"))));
        }
        ;
        if (v instanceof Nothing) {
          return "";
        }
        ;
        throw new Error("Failed pattern match at Main (line 573, column 45 - line 578, column 16): " + [v.constructor.name]);
      };
    };
  };
  var renderCardJson = function(json) {
    return function(editable) {
      return function(deckId) {
        var v = decodeJson3(json);
        if (v instanceof Right) {
          var v1 = bind1(getField4(v.value0)("cardId"))(function(cardId) {
            return bind1(getField22(v.value0)("faces"))(function(faces) {
              return pure1({
                cardId,
                faces
              });
            });
          });
          if (v1 instanceof Right) {
            var headHtml = (function() {
              if (editable) {
                return renderCardHead(deckId)(v1.value0.cardId);
              }
              ;
              return "";
            })();
            var facesHtml = foldl2(function(acc) {
              return function(fj) {
                return acc + renderStoredFaceHtml(fj)(editable)(deckId);
              };
            })("")(v1.value0.faces);
            return '<div class="card">' + (headHtml + (facesHtml + "</div>"));
          }
          ;
          if (v1 instanceof Left) {
            return "";
          }
          ;
          throw new Error("Failed pattern match at Main (line 551, column 16 - line 560, column 17): " + [v1.constructor.name]);
        }
        ;
        if (v instanceof Left) {
          return "";
        }
        ;
        throw new Error("Failed pattern match at Main (line 550, column 39 - line 561, column 15): " + [v.constructor.name]);
      };
    };
  };
  var renderViewPage = function(_model) {
    return function(deckId) {
      return function(meta) {
        return function(totalCards) {
          return function(cardsJson) {
            return function(editable) {
              var title = (function() {
                var $123 = meta.title === "";
                if ($123) {
                  return "Untitled Deck";
                }
                ;
                return meta.title;
              })();
              var editPrefix = (function() {
                if (editable) {
                  return "\u270E ";
                }
                ;
                return "";
              })();
              var navLinks = (function() {
                if (editable) {
                  return '\n          <a href="#/" class="nav-link">\u2190 Home</a>\n          <a href="#/play/' + (deckId + ('" class="nav-link">\u25B6 Play</a>\n          <a href="#/view/' + (deckId + '" class="nav-link">\u{1F441} View</a>')));
                }
                ;
                return '\n          <a href="#/" class="nav-link">\u2190 Home</a>\n          <a href="#/edit/' + (deckId + ('" class="nav-link">\u270E Edit</a>\n          <a href="#/play/' + (deckId + '" class="nav-link">\u25B6 Play</a>')));
              })();
              var cardsHtml = foldl2(function(acc) {
                return function(cj) {
                  return acc + renderCardJson(cj)(editable)(deckId);
                };
              })("")(cardsJson);
              var metaFormHtml = (function() {
                if (editable) {
                  return renderMetaForm(deckId)(meta)(Nothing.value);
                }
                ;
                return "";
              })();
              var totalPages = div3((totalCards + pageSize | 0) - 1 | 0)(pageSize);
              var paginationHtml = (function() {
                var $127 = totalPages <= 1;
                if ($127) {
                  return "";
                }
                ;
                return '<div id="card-pagination" class="pagination">' + (renderPaginationControls(0)(totalPages) + "</div>");
              })();
              return function __do3() {
                setInnerHTML("app")('\n    <main class="container">\n      <div class="page-nav">' + (navLinks + ("</div>\n      <h1>" + (editPrefix + (escapeHtml(title) + ('</h1>\n      <p class="deck-card-count">' + (show2(totalCards) + (" cards</p>\n      " + (metaFormHtml + ("\n      " + (paginationHtml + ('\n      <div id="card-list-container">' + (cardsHtml + ("</div>\n      " + (paginationHtml + ("\n      " + (renderNewCardButton(editable)(deckId) + "\n    </main>\n  ")))))))))))))))))();
                if (editable) {
                  return registerEditHandlers(deckId)();
                }
                ;
                return unit;
              };
            };
          };
        };
      };
    };
  };
  var decodeSettings = function(json) {
    var v = decodeJson3(json);
    if (v instanceof Right) {
      var v1 = bind1(getField32(v.value0)("learningRate"))(function(lr) {
        return bind1(getField32(v.value0)("defaultFacePriority"))(function(dfp) {
          return bind1(getField42(v.value0)("defaultLinkSiblings"))(function(dls) {
            return pure1({
              learningRate: lr,
              defaultFacePriority: dfp,
              defaultLinkSiblings: dls
            });
          });
        });
      });
      if (v1 instanceof Right) {
        return v1.value0;
      }
      ;
      if (v1 instanceof Left) {
        return defaultSettings;
      }
      ;
      throw new Error("Failed pattern match at Main (line 121, column 16 - line 128, column 30): " + [v1.constructor.name]);
    }
    ;
    if (v instanceof Left) {
      return defaultSettings;
    }
    ;
    throw new Error("Failed pattern match at Main (line 120, column 23 - line 129, column 28): " + [v.constructor.name]);
  };
  var renderSettingsPage = function(_model) {
    return loadSettings(function(settingsJson) {
      var settings = decodeSettings(settingsJson);
      var checkedAttr = (function() {
        if (settings.defaultLinkSiblings) {
          return "checked";
        }
        ;
        return "";
      })();
      return function __do3() {
        setInnerHTML("app")('<main class="container">' + ('<div class="page-nav"><a href="#/" class="nav-link">\u2190 Home</a></div>' + ("<h1>\u2699 Settings</h1>" + ('<form onsubmit="event.preventDefault(); window._saveSettings()">' + ("<fieldset><legend>Scheduler</legend>" + ('<label for="learning-rate">Learning rate</label>' + ('<input id="learning-rate" name="learning_rate" type="number" step="0.1" min="1.0" max="10.0" value="' + (show1(settings.learningRate) + ('">' + ("<small>Controls how fast momentum grows on correct answers. Default: 2.0</small>" + ("</fieldset>" + ("<fieldset><legend>Face defaults</legend>" + ('<label for="default-priority">Default priority</label>' + ('<input id="default-priority" name="default_face_priority" type="number" step="0.1" min="0.1" value="' + (show1(settings.defaultFacePriority) + ('">' + ("<small>Priority weight for new faces.</small><br>" + ('<label><input id="default-link-siblings" name="default_link_siblings" type="checkbox" ' + (checkedAttr + '> Link sibling faces by default</label><small>When checked, voting on one face affects momentum of all sibling faces.</small></fieldset><button type="submit">Save</button></form></main>')))))))))))))))))))();
        return setGlobal("_saveSettings")(saveSettingsFromJs)();
      };
    });
  };
  var decodeFaceArray = function(arr) {
    return concatMap(function(j) {
      var v = decodeSingleStoredFace(j);
      if (v instanceof Just) {
        return [v.value0];
      }
      ;
      if (v instanceof Nothing) {
        return [];
      }
      ;
      throw new Error("Failed pattern match at Main (line 359, column 40 - line 361, column 16): " + [v.constructor.name]);
    })(arr);
  };
  var decodePlayCard = function(deckId) {
    return function(deckTitle) {
      return function(json) {
        var v = decodeJson3(json);
        if (v instanceof Right) {
          var v1 = getFieldOptional$prime4(v.value0)("empty");
          if (v1 instanceof Right && (v1.value0 instanceof Just && v1.value0.value0)) {
            return {
              deckId,
              deckTitle,
              cardId: Nothing.value,
              frontFace: Nothing.value,
              backFaces: [],
              answerShown: false,
              allStoredFaces: []
            };
          }
          ;
          var v2 = bind1(getField4(v.value0)("cardId"))(function(cardId) {
            return bind1(getField22(v.value0)("faces"))(function(faces) {
              return bind1(getField4(v.value0)("frontFaceId"))(function(frontFaceId) {
                return pure1({
                  cardId,
                  faces,
                  frontFaceId
                });
              });
            });
          });
          if (v2 instanceof Right) {
            var decoded = decodeFaceArray(v2.value0.faces);
            var front = findFaceById(v2.value0.frontFaceId)(decoded);
            var backs = filter(function(f) {
              return f.faceId !== v2.value0.frontFaceId;
            })(decoded);
            return {
              deckId,
              deckTitle,
              cardId: new Just(v2.value0.cardId),
              frontFace: front,
              backFaces: backs,
              answerShown: false,
              allStoredFaces: v2.value0.faces
            };
          }
          ;
          if (v2 instanceof Left) {
            return {
              deckId,
              deckTitle,
              cardId: Nothing.value,
              frontFace: Nothing.value,
              backFaces: [],
              answerShown: false,
              allStoredFaces: []
            };
          }
          ;
          throw new Error("Failed pattern match at Main (line 336, column 12 - line 353, column 53): " + [v2.constructor.name]);
        }
        ;
        if (v instanceof Left) {
          return {
            deckId,
            deckTitle,
            cardId: Nothing.value,
            frontFace: Nothing.value,
            backFaces: [],
            answerShown: false,
            allStoredFaces: []
          };
        }
        ;
        throw new Error("Failed pattern match at Main (line 331, column 3 - line 356, column 49): " + [v.constructor.name]);
      };
    };
  };
  var decodeDeckMeta = function(json) {
    var v = decodeJson3(json);
    if (v instanceof Right) {
      var v1 = bind1(getField5(v.value0)("title"))(function(title) {
        return bind1(map6(fromMaybe(""))(getFieldOptional$prime12(v.value0)("description")))(function(desc) {
          return bind1(map6(fromMaybe([]))(getFieldOptional$prime23(v.value0)("tags")))(function(tags) {
            return bind1(map6(fromMaybe([]))(getFieldOptional$prime23(v.value0)("sources")))(function(sources) {
              return pure1({
                title,
                description: desc,
                tags,
                sources
              });
            });
          });
        });
      });
      if (v1 instanceof Right) {
        return v1.value0;
      }
      ;
      if (v1 instanceof Left) {
        return defaultDeckMeta;
      }
      ;
      throw new Error("Failed pattern match at Main (line 172, column 16 - line 180, column 30): " + [v1.constructor.name]);
    }
    ;
    if (v instanceof Left) {
      return defaultDeckMeta;
    }
    ;
    throw new Error("Failed pattern match at Main (line 171, column 23 - line 181, column 28): " + [v.constructor.name]);
  };
  var decodeDeckSummaries = function(arr) {
    var decodeSummary = function(json) {
      var v = decodeJson3(json);
      if (v instanceof Right) {
        var v1 = bind1(getField5(v.value0)("id"))(function(id2) {
          return bind1(getField4(v.value0)("cardCount"))(function(cardCount) {
            return bind1(getField1(v.value0)("meta"))(function(metaJson) {
              var meta = decodeDeckMeta(metaJson);
              return pure1({
                id: id2,
                meta,
                cardCount
              });
            });
          });
        });
        if (v1 instanceof Right) {
          return [v1.value0];
        }
        ;
        if (v1 instanceof Left) {
          return [];
        }
        ;
        throw new Error("Failed pattern match at Main (line 159, column 20 - line 167, column 21): " + [v1.constructor.name]);
      }
      ;
      if (v instanceof Left) {
        return [];
      }
      ;
      throw new Error("Failed pattern match at Main (line 158, column 26 - line 168, column 19): " + [v.constructor.name]);
    };
    return concatMap(decodeSummary)(arr);
  };
  var loadEditPage = function(model) {
    return function(deckId) {
      return getDeckMeta(deckId)(function(metaJson) {
        var meta = decodeDeckMeta(metaJson);
        return getDeckCardCount(deckId)(function(count) {
          return getCardList(deckId)(0)(pageSize)(function(cardsJson) {
            return function __do3() {
              renderViewPage(model)(deckId)(meta)(count)(cardsJson)(true)();
              return initCardPagination(deckId)(count)(true)();
            };
          });
        });
      });
    };
  };
  var loadImportPage = function(model) {
    return function(deckId) {
      return getDeckMeta(deckId)(function(metaJson) {
        var meta = decodeDeckMeta(metaJson);
        return renderImportPage(model)(deckId)(meta)(Nothing.value);
      });
    };
  };
  var loadPlayPage = function(model) {
    return function(deckId) {
      return getDeckMeta(deckId)(function(metaJson) {
        var meta = decodeDeckMeta(metaJson);
        return getFrontCardSpeculative(deckId)(function(cardJson) {
          var playState = decodePlayCard(deckId)(meta.title)(cardJson);
          return function __do3() {
            renderPlayPage(model)(playState)();
            speculativePrefetch(deckId)();
            return needsRebalance(deckId)(function(needed) {
              if (needed) {
                return rebalanceDeck(deckId)(pure4(unit));
              }
              ;
              return pure4(unit);
            })();
          };
        });
      });
    };
  };
  var loadViewPage = function(model) {
    return function(deckId) {
      return getDeckMeta(deckId)(function(metaJson) {
        var meta = decodeDeckMeta(metaJson);
        return getDeckCardCount(deckId)(function(count) {
          return getCardList(deckId)(0)(pageSize)(function(cardsJson) {
            return function __do3() {
              renderViewPage(model)(deckId)(meta)(count)(cardsJson)(false)();
              return initCardPagination(deckId)(count)(false)();
            };
          });
        });
      });
    };
  };
  var deckItemHtml = function(d) {
    var title = escapeHtml((function() {
      var $160 = d.meta.title === "";
      if ($160) {
        return "Untitled Deck";
      }
      ;
      return d.meta.title;
    })());
    return '<li class="deck-item">\n    <div class="deck-info">\n      <a href="#/play/' + (d.id + ('" class="deck-name">' + (title + ('</a>\n      <span class="deck-card-count">' + (show2(d.cardCount) + (' cards</span>\n    </div>\n    <div class="deck-actions">\n      <a href="#/play/' + (d.id + ('" class="deck-action">\u25B6 Play</a>\n      <a href="#/edit/' + (d.id + ('" class="deck-action">\u270E Edit</a>\n      <a href="#/import/' + (d.id + (`" class="deck-action">\u2B06 Import</a>
      <a href="javascript:void(0)" onclick="window._deleteDeck(this)" data-id='` + (d.id + ("' data-title='" + (title + `' class="deck-action deck-action--danger">\u{1F5D1}</a>
    </div>
  </li>`)))))))))))))));
  };
  var renderHomePage = function(model) {
    return function(decks) {
      return function __do3() {
        var connected = isDriveConnected();
        var details = getSyncDetails();
        var deckItems = foldl2(function(acc) {
          return function(d) {
            return acc + deckItemHtml(d);
          };
        })("")(decks);
        var emptyMsg = (function() {
          var $161 = $$null(decks);
          if ($161) {
            return '<p class="empty-state">No decks yet. Create one to get started!</p>';
          }
          ;
          return "";
        })();
        var pendingLabel = (function() {
          var $162 = details.pendingEntries > 0;
          if ($162) {
            return show2(details.pendingEntries) + " pending";
          }
          ;
          return "none";
        })();
        var lastSyncLabel = (function() {
          var $163 = details.lastSync === "";
          if ($163) {
            return "never";
          }
          ;
          return details.lastSync;
        })();
        var errorLine = (function() {
          if (details.error === "") {
            return "";
          }
          ;
          return '<div class="sync-detail-row sync-detail-error">\u26A0 ' + (escapeHtml(details.error) + "</div>");
        })();
        var statusIcon = (function() {
          if (details.status === "syncing") {
            return "\u{1F504}";
          }
          ;
          if (details.status === "error") {
            return "\u26A0";
          }
          ;
          return "\u2601";
        })();
        var syncPopover = '\n        <div class="sync-popover">\n          <div class="sync-detail-row">Status: ' + (details.status + ('</div>\n          <div class="sync-detail-row">Last sync: ' + (lastSyncLabel + (`</div>
          <div class="sync-detail-row">Unsync'd votes: ` + (pendingLabel + ("</div>\n          " + (errorLine + "\n        </div>")))))));
        var syncButton = (function() {
          if (connected) {
            return '<span class="sync-btn-wrap">\n                <a href="javascript:void(0)" onclick="window._driveSync()" class="toolbar-link">' + (statusIcon + (" Sync</a>" + (syncPopover + '</span><a href="javascript:void(0)" onclick="window._driveDisconnect()" class="toolbar-link">\u{1F50C} Disconnect</a>')));
          }
          ;
          return '<a href="javascript:void(0)" onclick="window._driveConnect()" class="toolbar-link">\u2601 Connect Drive</a>';
        })();
        var syncStatus = (function() {
          if (connected) {
            return '<div class="sync-status"><span id="sync-indicator"></span></div>';
          }
          ;
          return "";
        })();
        setInnerHTML("app")('\n    <main class="container">\n      <div class="home-header">\n        <h1>\u{1F4DA} Decks</h1>\n        <div class="toolbar">\n          ' + (syncButton + ('\n          <a href="#/restore" class="toolbar-link">\u2B06 Restore</a>\n          <a href="javascript:void(0)" onclick="window._exportBackup()" class="toolbar-link">\u2B07 Backup</a>\n          <a href="#/settings" class="toolbar-link">\u2699 Settings</a>\n        </div>\n      </div>\n      ' + (syncStatus + ("\n      " + (emptyMsg + ('\n      <ul class="deck-list">' + (deckItems + `</ul>
      <button class="btn-primary" onclick="window._newDeck()">+ New Deck</button>
      <details class="about-section">
        <summary>About</summary>
        <p><strong>umemo</strong> is a spaced-repetition flashcard app.
        It uses a lapsed-review algorithm to schedule cards so you review them
        right before you'd forget.</p>
        <ul>
          <li><strong>Privacy-first</strong> \u2013 all data stays in your browser (IndexedDB). Nothing is sent to any server.</li>
          <li><strong>Works offline</strong> \u2013 no network connection needed after the first load.</li>
          <li><strong>Google Drive sync</strong> \u2013 optionally sync decks across devices via your own Drive account.</li>
          <li><strong>Import</strong> \u2013 bring in decks from TSV files or other sources.</li>
        </ul>
        <p><a href="privacy.html">Privacy Policy</a> \xB7 <a href="terms.html">Terms of Service</a></p>
      </details>
    </main>
  `))))))))();
        setGlobal("_newDeck")(newDeck(model))();
        setGlobal("_exportBackup")(exportBackup(model))();
        setGlobal("_driveConnect")(driveConnect(model))();
        setGlobal("_driveDisconnect")(driveDisconnect(model))();
        setGlobal("_driveSync")(driveFullSync(model))();
        return registerDeleteDeckHandler(model)();
      };
    };
  };
  var loadHomePage = function(model) {
    return loadDeckSummaries(model.user)(function(summariesJson) {
      var decks = decodeDeckSummaries(summariesJson);
      return renderHomePage(model)(decks);
    });
  };
  var handleRouteChange = function(model) {
    return function(route) {
      if (route instanceof Home) {
        return loadHomePage(model);
      }
      ;
      if (route instanceof Play) {
        return loadPlayPage(model)(route.value0);
      }
      ;
      if (route instanceof ViewDeck) {
        return loadViewPage(model)(route.value0);
      }
      ;
      if (route instanceof EditDeck) {
        return loadEditPage(model)(route.value0);
      }
      ;
      if (route instanceof ImportSheet) {
        return loadImportPage(model)(route.value0);
      }
      ;
      if (route instanceof SettingsRoute) {
        return renderSettingsPage(model);
      }
      ;
      if (route instanceof RestoreBackup) {
        return renderRestorePage(model);
      }
      ;
      throw new Error("Failed pattern match at Main (line 136, column 33 - line 143, column 43): " + [route.constructor.name]);
    };
  };
  var driveDisconnect = function(model) {
    return function __do3() {
      driveSignOut();
      return handleRouteChange(model)(Home.value)();
    };
  };
  var driveConnect = function(model) {
    return driveSignIn(function __do3() {
      handleRouteChange(model)(Home.value)();
      return startBackgroundSync(model)();
    })(function(v) {
      return pure4(unit);
    });
  };
  var autoSyncOnLoad = function(model) {
    return function __do3() {
      var connected = isDriveConnected();
      if (connected) {
        return startBackgroundSync(model)();
      }
      ;
      return unit;
    };
  };
  var main = /* @__PURE__ */ initDB(function __do2() {
    registerPortModule();
    var hash = getLocationHash();
    var route = parseRoute(hash);
    return loadSettings(function(settingsJson) {
      var settings = decodeSettings(settingsJson);
      var model = {
        decks: initialModel.decks,
        edit: initialModel.edit,
        importState: initialModel.importState,
        play: initialModel.play,
        restoreResult: initialModel.restoreResult,
        settingsForm: initialModel.settingsForm,
        user: initialModel.user,
        viewMode: initialModel.viewMode,
        route,
        settings
      };
      return function __do3() {
        onHashChange(function(newHash) {
          var newRoute = parseRoute(newHash);
          return handleRouteChange(model)(newRoute);
        })();
        handleRouteChange(model)(route)();
        return autoSyncOnLoad(model)();
      };
    })();
  });

  // <stdin>
  main();
})();
