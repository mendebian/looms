import axios from 'https://cdn.jsdelivr.net/npm/axios@1.5.0/dist/esm/axios.min.js';
import { auth, signOut, database, get, set, databaseRef, update, push, query, child, onValue, uploadBytesResumable, storageRef, getDownloadURL, remove } from '../../firebase.js';

let currentUser, iconFile;

function checkAuthState() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                const userData = await getUserData(currentUser.uid);
                document.querySelector('.tab-icon').src = userData.details.profile_icon || '../img/profile-icon.jpg';
                onValue(databaseRef(database, 'users/' + currentUser.uid + '/inbox/'), (snapshot) => { if (snapshot.exists()) inboxBadge(true) });
                resolve(user);
            } else {
                window.location.href = "./login.html";
                reject('User not logged in');
            }
        });
    });
}

function logOut() {
    signOut(auth).then(() => {
        window.location.href = "./login.html";
      }).catch((error) => {
        alert("An error occurred while logging out.");
      });
}

class Post {
    constructor(user, postData) {
        this.userDetails = user.details;
        this.postData = postData;
        this.repliesCount = postData.replies ? Object.keys(postData.replies).length : 0;
        this.favoritesCount = postData.favorites ? Object.keys(postData.favorites).length : 0;
        this.isFavorited = postData.favorites ? Object.keys(postData.favorites).includes(currentUser.uid) : false;
    }

    async init() {
        this.replyDetails = this.postData.replied ? await getUserData(this.postData.replied.uid) : null;
    }

    generateHTML() {
        return `
            <div class="post-container" data-key="${this.postData.key}">
                <img class="post-icon" onclick="loadView('${this.userDetails.uid}')" src="${this.userDetails.profile_icon || '../img/profile-icon.jpg'}">
                <div class="post-content">
                    <div class="post-head">
                        <p class="post-author" onclick="loadView('${this.userDetails.uid}')">${this.userDetails.display_name} ${this.userDetails.name_tag ? `<span class="post-tag">${this.userDetails.name_tag}</span>` : ''}</p>
                        <div class="post-interaction-content" onclick="modalOverlay(true, '${this.userDetails.uid}', '${this.postData.key}')">
                            <svg style="fill: var(--font-secondary)" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px"><path d="M479.79-192Q450-192 429-213.21t-21-51Q408-294 429.21-315t51-21Q510-336 531-314.79t21 51Q552-234 530.79-213t-51 21Zm0-216Q450-408 429-429.21t-21-51Q408-510 429.21-531t51-21Q510-552 531-530.79t21 51Q552-450 530.79-429t-51 21Zm0-216Q450-624 429-645.21t-21-51Q408-726 429.21-747t51-21Q510-768 531-746.79t21 51Q552-666 530.79-645t-51 21Z"/></svg>
                        </div>
                    </div>
                    ${this.postData.replied ? `<div class="post-reply-to-container"><svg class="post-reply-to-icon" style="fill: var(--font-secondary)" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px"><path d="m576-192-51-51 129-129H240v-444h72v372h342L525-573l51-51 216 216-216 216Z"/></svg><p class="post-reply-to" onclick="loadView('${this.postData.replied.uid}/${this.postData.replied.key}')">Reply to ${this.replyDetails.details.display_name}</p></div>` : ''}
                    <p class="post-text" onclick="loadView('${this.userDetails.uid}/${this.postData.key}')">${preventHTML(this.postData.caption)}</p>
                    <div class="post-footer">
                        <p class="post-timestamp">${formatDate(this.postData.posted)}</p>
                        <div class="post-interaction">
                            <div class="post-interaction-content" onclick="loadView('${this.userDetails.uid}/${this.postData.key}')">
                                <svg class="post-reply-icon" style="fill: var(--font-secondary)" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px"><path d="m240-240-82.88 82.88Q140-140 118-149.41q-22-9.4-22-33.59v-609q0-29.7 21.15-50.85Q138.3-864 168-864h624q29.7 0 50.85 21.15Q864-821.7 864-792v480q0 29.7-21.15 50.85Q821.7-240 792-240H240Zm-30-72h582v-480H168v522l42-42Zm-42 0v-480 480Z"/></svg>
                                <p class="post-reply-count" style="color: var(--font-secondary)">${this.repliesCount}</p>
                            </div>
                            <div class="post-interaction-content" onclick="favoritePost('post', '${this.postData.uid}', '${this.postData.key}')">
                                <svg class="post-favorite-icon" data-key="${this.postData.key}" style="fill: ${this.isFavorited ? "#C7253E" : "var(--font-secondary)"};" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px"><path d="M480-170q-13 0-25.5-4.5T431-189l-59-54q-109-97-192.5-189.5T96-634q0-88 60-147t149-59q51 0 96.5 21.5T480-757q35-40 79.5-61.5T655-840q89 0 149 59t60 147q0 109-83.5 201.5T588-243l-59 54q-11 10-23.5 14.5T480-170Z"/></svg>
                                <p class="post-favorite-count" data-key="${this.postData.key}" style="color: ${this.isFavorited ? "#C7253E" : "var(--font-secondary)"};">${this.favoritesCount}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

async function loadView(viewId, push = true) {
    if (!currentUser) {
        await checkAuthState();
    }

    const view = document.getElementById('home-view');
    view.innerHTML = '';
    view.appendChild(renderView(viewId));
    if (push) {
        history.pushState({ viewId }, null, `#${viewId}`);
    }
}

function renderView(viewId) {
    const fragment = document.createDocumentFragment();
    const content = document.createElement('div');
    content.classList.add('content');
    
    switch (viewId) {
        case 'feed':
            (async () => {
                const feedData = await getUserFeed(currentUser.uid);

                if (feedData.length > 0) {
                    for (const data of feedData) {
                        const user = await getUserData(data.uid);
    
                        const post = new Post(user, data);
                        await post.init();
    
                        content.innerHTML += post.generateHTML();
                    }    
                } else {
                    content.innerHTML = `
                        <p class="failed">Follow a few accounts to build your timeline.</p>
                    `;
                }
            })();
            break;
        case 'discover':
            content.innerHTML = `
                <div class="discover-container">
                    <p class="title">Discover</p>
                    <input type="text" class="search-content" placeholder="Search">
                    <div class="query-container" style="display: none;">
                    </div>
                </div>
            `;

            content.addEventListener('keydown', async (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();

                    const query = document.querySelector('.search-content').value;
                    if (query) {
                        await get(databaseRef(database, 'users/')).then(snapshot => {
                            const accounts = Object.values(snapshot.val())
                                .map(user => ({ uid: user.uid, ...user.details }))
                                .filter(user => 
                                    user.display_name.toLowerCase().includes(query.toLowerCase()) ||
                                    user.email.toLowerCase().includes(query.toLowerCase())
                                );
                            
                            const container = document.querySelector('.query-container');
                            container.style.display = 'flex';
                            container.innerHTML = '';
                            
                            if (accounts.length > 0) {
                                accounts.forEach(details => {
                                    container.innerHTML += `
                                        <div class="query-content" onclick="loadView('${details.uid}')">
                                            <img class="query-icon" src="${details.profile_icon || '../img/profile-icon.jpg'}">
                                            <p class="query-name">${details.display_name}</p>
                                        </div>
                                    `;
                                });
                            } else {
                                container.innerHTML = `
                                    <p class="failed">Credentials not found in this query.</p>
                                `;
                            }
                        });
                    }
                }
            });
            break;
        case 'new':
            content.innerHTML = `
                <div class="new-container">
                    <div class="new-header">
                        <button class="new-publish" onclick="publish()">Publish</button>
                    </div>
                    <textarea class="new-content" maxlength="992" placeholder="Enter your post here..."></textarea>
                </div>
            `;
            break;
        case 'inbox':
            content.innerHTML = `
                <p class="failed">I didn't like it. I'll start from scratch.</p>
            `; 
            /* (async () => {
                const snapshot = await get(databaseRef(database, `users/${currentUser.uid}/inbox/`));
                if (snapshot.exists()) {
                    const inboxUpdates = Object.values(snapshot.val());
                    
                    content.innerHTML = `
                        <div class=inbox-container>
                        </div>
                    `;

                    for (const update of inboxUpdates) {
                        const userData = await getUserData(update.sender);
                        const userDetails = userData.details;
                        const postData = update.post ? await getPostData(update.sender, update.post) : null;
                        
                        document.querySelector('.inbox-container').innerHTML += `
                            <div class="inbox-content" onclick="loadView('${update.type === "follow" ? `${update.sender}` : `${update.sender}/${update.post}`}')">
                                <img class="inbox-icon" src="${userDetails.profile_icon ? userDetails.profile_icon : '../img/profile-icon.jpg'}">
                                <div class="update-content">
                                    <p><strong>${userDetails.display_name}</strong> <span class="update-type">${update.type === "favorite" ? "favorited" : update.type === "reply" ? "replied to you" : update.type === "follow" ? "followed you" : ""}</span></p>
                                    ${postData ? `<span class="update-caption">${postData.caption || "<em>deleted post</em>"}</span>` : ''}
                                </div>
                            </div>
                        `;
                    };
                } else {
                    content.innerHTML = `
                        <p class="failed">Check your messages here.</p>
                    `;
                }           
            })(); */
            break;
        case 'more':
            content.innerHTML = `
                <div class="settings-container">
                    <p class="title">More</p>
                    <div class="settings-content">
                        <div class="modal-button" onclick="loadView('${currentUser.uid}')">
                            <p>My profile</p>
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="var(--font-secundary)"><path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-240v-32q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v32q0 33-23.5 56.5T720-160H240q-33 0-56.5-23.5T160-240Z"/></svg>
                        </div>
                        <div class="modal-button" onclick="loadView('edit-profile', false)">
                            <p>Edit profile</p>
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="var(--font-secundary)"><path d="M80-240v-32q0-34 17-62.5t47-43.5q57-29 118.5-46T388-441q14 0 22 12.5t3 26.5q-6 21-9 42t-3 43q0 29 6 56t17 53q8 17-1.5 32.5T396-160H160q-33 0-56.5-23.5T80-240Zm600 0q33 0 56.5-23.5T760-320q0-33-23.5-56.5T680-400q-33 0-56.5 23.5T600-320q0 33 23.5 56.5T680-240ZM400-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm234 328-6-28q-12-5-22.5-10.5T584-204l-29 9q-13 4-25.5-1T510-212l-8-14q-7-12-5-26t13-23l22-19q-2-14-2-26t2-26l-22-19q-11-9-13-22.5t5-25.5l9-15q7-11 19-16t25-1l29 9q11-8 21.5-13.5T628-460l6-29q3-14 13.5-22.5T672-520h16q14 0 24.5 9t13.5 23l6 28q12 5 22.5 11t21.5 15l27-9q14-5 27 0t20 17l8 14q7 12 5 26t-13 23l-22 19q2 12 2 25t-2 25l22 19q11 9 13 22.5t-5 25.5l-9 15q-7 11-19 16t-25 1l-29-9q-11 8-21.5 13.5T732-180l-6 29q-3 14-13.5 22.5T688-120h-16q-14 0-24.5-9T634-152Z"/></svg>
                        </div>
                        <div class="modal-button" onclick="toggleTheme()">
                            <p>Toggle theme</p>
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="var(--font-secundary)"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm40-83q119-15 199.5-104.5T800-480q0-123-80.5-212.5T520-797v634Z"/></svg>
                        </div>
                        <div class="modal-button" onclick="logOut()">
                            <p>Log out and switch accounts</p>
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="var(--font-secundary)"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h240q17 0 28.5 11.5T480-800q0 17-11.5 28.5T440-760H200v560h240q17 0 28.5 11.5T480-160q0 17-11.5 28.5T440-120H200Zm487-320H400q-17 0-28.5-11.5T360-480q0-17 11.5-28.5T400-520h287l-75-75q-11-11-11-27t11-28q11-12 28-12.5t29 11.5l143 143q12 12 12 28t-12 28L669-309q-12 12-28.5 11.5T612-310q-11-12-10.5-28.5T613-366l74-74Z"/></svg>
                        </div>
                    </div>
                </div>
            `;
            break;
        case 'edit-profile':
            (async () => {
                const userData = await getUserData(currentUser.uid);
                const userDetails = userData.details;

                content.innerHTML = `
                    <div class="edit-container">
                        <p class="title">Edit profile</p>
                        <div class="edit-content">
                            <img class="edit-profile-icon" onclick="document.getElementById('file-input').click()" src="${userDetails.profile_icon ? userDetails.profile_icon : '../img/profile-icon.jpg'}">
                            <input type="file" id="file-input" accept="image/*" style="display: none;" onchange="handleFileSelect(event)">
                            <input type="text" class="edit-name" maxlength="24" placeholder="Display name" value="${userDetails.display_name}">
                            <input type="text" class="edit-tag" maxlength="16" placeholder="Name tag" value="${userDetails.name_tag || ''}">
                            <textarea class="edit-description" maxlength="256" rows="5" placeholder="Description">${userDetails.description || ''}</textarea>
                            <button class="edit-save">Save changes</button>
                        </div>
                    </div>
                `;

                document.querySelector('.edit-save').addEventListener('click', async function() {
                    let icon = userDetails.profile_icon || null;
                    const name = document.querySelector('.edit-name').value;
                    const description = document.querySelector('.edit-description').value || null;
                    const tag = document.querySelector('.edit-tag').value || null;

                    if (!name) {
                        return alert('A display name is required.');
                    }

                    if (iconFile) {
                        await uploadBytesResumable(storageRef(storage, `icons/${currentUser.uid}`), iconFile);
                        icon = await getDownloadURL(storageRef(storage, `icons/${currentUser.uid}`));
                    }

                    await update(databaseRef(database, `users/${currentUser.uid}/details`), {
                        profile_icon: icon,
                        display_name: name,
                        name_tag: tag,
                        description: description
                    });

                    loadView(currentUser.uid);
                });
            })();
            break;
        default:
            const data = viewId.split('/');

            (async () => {
                const userData = await getUserData(data[0]);
                const userDetails = userData.details;
                const userNetwork = userData.network;
                const isFollower = userNetwork && userNetwork.followers ? userNetwork.followers.includes(currentUser.uid) : false;

                if (data[1]) {
                    const postData = await getPostData(data[0], data[1]);
                    const postReplies = postData.replies ? Object.values(postData.replies) : null;
                    const repliesCount = postData.replies ? Object.keys(postData.replies).length : 0;
                    const favoritesCount = postData.favorites ? Object.keys(postData.favorites).length : 0;
                    const replyDetails = postData.replied ? await getUserData(postData.replied.uid) : null;

                    content.innerHTML = `
                        <div class="expanded-container">
                            <div class="expanded-post-container">
                            ${postData.replied ? `<div class="expanded-reply-to-container"><svg class="expanded-reply-to-icon" style="fill: var(--font-secondary)" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px"><path d="m576-192-51-51 129-129H240v-444h72v372h342L525-573l51-51 216 216-216 216Z"/></svg><p class="expanded-reply-to" onclick="loadView('${postData.replied.uid}/${postData.replied.key}')">Reply to ${replyDetails.details.display_name}</p></div>` : ''}
                                <div class="expanded-post-details" onclick="loadView('${userDetails.uid}')">
                                    <img class="expanded-post-icon" src="${userDetails.profile_icon ? userDetails.profile_icon : '../img/profile-icon.jpg'}">
                                    <div class="expanded-post-author">
                                        <p class="expanded-post-name">${userDetails.display_name}</p>
                                        ${userDetails.name_tag ? `<p class="expanded-post-tag">${userDetails.name_tag}</p>` : ''}
                                    </div>
                                </div>
                                <p class="expanded-post-text">${preventHTML(postData.caption)}</p>
                                <div class="expanded-post-footer">
                                    <p class="expanded-post-timestamp">${formatDate(postData.posted)}</p>
                                    <div class="expanded-post-counts">
                                        <p><strong>${repliesCount}</strong> replies</p>
                                        <p><strong class="expanded-favorites-count">${favoritesCount}</strong> likes</p>
                                    </div>
                                </div>
                            </div>
                            <div class="expanded-reply-container">
                                <input type="text" class="expanded-reply-text" maxlength="248" placeholder="Reply something here...">
                                <svg onclick="reply('${postData.uid}', '${postData.key}')" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" style="fill: var(--font-secondary);"><path d="M193-212q-18 7-33.5-3.5T144-245v-139l288-96-288-96v-139q0-19 15.5-29.5T193-748l587 235q23 9 23 33t-23 33L193-212Z"/></svg>
                            </div>
                            <div class="expanded-replies-container">

                            </div>
                        </div>
                    `;

                    content.addEventListener('keydown', async (event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
        
                            const replyContent = document.querySelector('.expanded-reply-text').value;
                            if (reply) {
                                reply(postData.uid, postData.key);
                            }
                        }
                    });

                    if (postReplies) {
                        postReplies.sort((x, y) => new Date(y.posted) - new Date(x.posted));

                        postReplies.forEach(async (reply) => {
                            const userData = await getUserData(reply.uid);
                            const replyData = await getPostData(reply.uid, reply.key);

                            const post = new Post(userData, replyData);
                            await post.init();

                            content.innerHTML += post.generateHTML();
                        });
                        
                    } else {
                        content.innerHTML += `
                            <p class="failed">No replies yet.</p>
                        `;
                    }
                } else {
                    const favoritePostCounts = userData.favorite_posts ? Object.keys(userData.favorite_posts).length : null;
                    const userPosts = userData.posts ? Object.values(userData.posts).sort((x, y) => new Date(y.posted) - new Date(x.posted)) : [];

                    content.innerHTML = `
                        <div class="profile-content">
                            <img class="profile-icon" src="${userDetails.profile_icon ? userDetails.profile_icon : '../img/profile-icon.jpg'}">
                            <div class="profile-details">
                                <p class="profile-display-name">${userDetails.display_name}<span class="profile-tag"> ${userDetails.name_tag || ""}</span></p>       
                                <p class="profile-description" ${userDetails.description ? '' : 'style="display: none;"'}>${userDetails.description ? userDetails.description : ""}</p>
                                <div class="profile-actions">
                                    ${data[0] === currentUser.uid ? `<button class="profile-edit" onclick="loadView('edit-profile', false)">Edit profile</button>` : isFollower ? `<button class="profile-unfollow" onclick="connection(true, '${userDetails.uid}')">Unfollow</button>` : `<button class="profile-follow" onclick="connection(false, '${userDetails.uid}')">Follow</button>`}
                                    <button class="profile-share" onclick="copy('https://looms.vercel.app/src/html/main.html#${userDetails.uid}')">Share</button>
                                </div>
                                <div class="profile-network">
                                    <p class="profile-count"><strong>${userNetwork && userNetwork.followers && Object.values(userNetwork.followers).length || "No"}</strong><span>followers</span></p>
                                    <p class="profile-count"><strong>${userNetwork && userNetwork.following && Object.values(userNetwork.following).length || "No"}</strong><span>following</span></p>
                                    <p class="profile-count"><strong>${userPosts && Object.keys(userPosts).length || "No"}</strong><span>posts</span></p>
                                    <p class="profile-count"><strong>${favoritePostCounts || "No"}</strong><span>likes</span></p>
                                </div>
                            </div>
                        </div>
                    `;

                    if (userPosts.length > 0) {
                        for (const postData of userPosts) {
                            const post = new Post(userData, postData);
                            await post.init();
                            content.innerHTML += post.generateHTML();
                        }
                    } else {
                        content.innerHTML += `
                            <p class="failed">No posts yet.</p>
                        `;
                    }
                }
            })();
            break;
    }

    fragment.appendChild(content);
    return fragment;
}

window.onpopstate = function(event) {
    if (event.state && event.state.viewId) {
        loadView(event.state.viewId, false);
    } else {
        loadView('feed', false);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const viewId = location.hash.substring(1) || 'feed';
    loadView(viewId, false);

    if ((localStorage.getItem('dark') || 'light') === 'dark') {
        document.documentElement.classList.add('dark');
    }
});

async function getUserData(uid) {
    return await get(databaseRef(database, 'users/' + uid)).then(snapshot => snapshot.val());
}

async function getPostData(uid, key) {
    return await get(databaseRef(database, 'users/' + uid + '/posts/' + key)).then(snapshot => snapshot.val());
}

async function getUserFeed(uid) {
    const snapshot = await get(databaseRef(database, `users/${uid}/network/`));
    const network = snapshot.exists() ? snapshot.val() : {};
    const following = [...Object.values(network.following || {}), uid];

    if (following.length === 0) return [];
    const promises = following.map(async user => {
        const postSnapshot = await get(databaseRef(database, `users/${user}/posts/`));
        return Object.values(postSnapshot.val() || {});

    });

    const results = await Promise.all(promises);
    const followedPosts = results.flat();

    return followedPosts
        .sort((x, y) => new Date(y.posted) - new Date(x.posted))
        .slice(0, 24)
}

function handleFileSelect(event) {
    iconFile = event.target.files[0];

    if (iconFile) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = new Image();
            
            img.onload = function() {
                if (img.width === img.height) {
                    document.querySelector('.edit-profile-icon').src = e.target.result;
                } else {
                    alert('Please select a square image.');
                    event.target.value = '';
                }
            };
            
            img.src = e.target.result;
        };
        
        reader.readAsDataURL(iconFile);
    }
}

function formatDate(isoDate) {
    const date = new Date(isoDate);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const formattedDate = date.toLocaleDateString('en-US', options);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${formattedDate} at ${hours}:${minutes}`;
}

function publish() {
    const post = document.querySelector(".new-content");
    const postContent = post.value.trim();

    if (postContent !== "" && postContent.length <= 992) {
        post.value = "";
        
        const key = push(child(databaseRef(database), `users/${currentUser.uid}/posts/`)).key;

        const postData = {
            key: key,
            uid: currentUser.uid,
            caption: postContent,
            posted: new Date().toISOString(),
        };

        set(databaseRef(database, 'users/' + currentUser.uid + '/posts/' + key), postData);
    }    
}

async function reply(postUid, postKey) {
    const reply = document.querySelector(".expanded-reply-text");
    const replyContent = reply.value.trim();

    if (replyContent !== "" && replyContent.length <= 248) {
        reply.value = "";
        
        const key = push(child(databaseRef(database), `users/${currentUser.uid}/posts/`)).key;

        const repliedPost = {
            uid: postUid,
            key: postKey
        };

        const replyData = {
            replied: repliedPost,
            key: key,
            uid: currentUser.uid,
            caption: replyContent,
            posted: new Date().toISOString(),
        };

        const whoReplied = {
            uid: currentUser.uid,
            key: key
        };

        set(databaseRef(database, 'users/' + currentUser.uid + '/posts/' + key), replyData);
        push(databaseRef(database, 'users/' + postUid + '/posts/' + postKey + '/replies/'), whoReplied);
        sendUpdate('reply', postUid, key);
        loadView(postUid, postKey);
    }    
}

function preventHTML(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig, function(url) {
            let displayText = url.replace(/^(https?|ftp|file):\/\//, '');
            displayText = displayText.length > 20 ? displayText.slice(0, 20) + "..." : displayText;
            return `<a href="${url}" target="_blank">${displayText}</a>`;
        });
}

function deletePost(key) {
    remove(databaseRef(database, 'users/' + currentUser.uid + '/posts/' + key))
        .then(() => {
            document.querySelector(`.post-container[data-key="${key}"]`).remove();
        })
}

function connection(follow, uid) {
    if (follow) {
        Promise.all([
            get(databaseRef(database, 'users/' + currentUser.uid + '/network/')).then(snapshot => {
                const network = snapshot.val() || { following: [] };
                network.following = network.following.filter(id => id !== uid);
                return set(databaseRef(database, 'users/' + currentUser.uid + '/network/'), network);
            }),
            get(databaseRef(database, 'users/' + uid + '/network/')).then(snapshot => {
                const network = snapshot.val() || { followers: [] };
                network.followers = network.followers.filter(id => id !== currentUser.uid);
                return set(databaseRef(database, 'users/' + uid + '/network/'), network);
            })
        ]).then(() => {
            loadView(uid);
        });
    } else {
        Promise.all([
            get(databaseRef(database, 'users/' + currentUser.uid + '/network/')).then(snapshot => {
                const network = snapshot.val() || { followers: [], following: [] };
                network.following = network.following || [];
                network.following.push(uid);
                return set(databaseRef(database, 'users/' + currentUser.uid + '/network/'), network);
            }),
            get(databaseRef(database, 'users/' + uid + '/network/')).then(snapshot => {
                const network = snapshot.val() || { followers: [], following: [] };
                network.followers = network.followers || [];
                network.followers.push(currentUser.uid);
                return set(databaseRef(database, 'users/' + uid + '/network/'), network);
            })
        ]).then(() => {
            loadView(uid);
            sendUpdate('follow', uid, null);
        });
    }
}

function favoritePost(type, uid, key) {
    if (key !== 'null') {
        const numberElement = document.querySelector(`.${type}-favorite-count[data-key="${key}"]`);
        const iconElement = document.querySelector(`.${type}-favorite-icon[data-key="${key}"]`);
        
        if (numberElement) {
            get(databaseRef(database, `users/${uid}/posts/${key}/favorites/${currentUser.uid}`)).then((snapshot) => {
                const updates = {};

                if (snapshot.exists()) {
                    updates[`users/${uid}/posts/${key}/favorites/${currentUser.uid}`] = null;
                    updates[`users/${currentUser.uid}/favorite_posts/${key}`] = null;
                    return update(databaseRef(database), updates).then(() => {
                        numberElement.textContent = Math.max(0, parseInt(numberElement.textContent, 10) - 1);
                        numberElement.style.color = 'var(--font-secondary)';
                        iconElement.style.fill = 'var(--font-secondary)';
                    });
                } else {
                    updates[`users/${uid}/posts/${key}/favorites/${currentUser.uid}`] = true;
                    updates[`users/${currentUser.uid}/favorite_posts/${key}`] = true;
                    sendUpdate('favorite', uid, key);
                    return update(databaseRef(database), updates).then(() => {
                        numberElement.textContent = parseInt(numberElement.textContent, 10) + 1;
                        numberElement.style.color = '#C7253E';
                        iconElement.style.fill = '#C7253E';
                    });
                }
            }).catch((error) => {
                console.error("Error favoriting post:", error);
            });
        }
    }
}

function sendUpdate(type, recipient, key) {
    push(databaseRef(database, 'users/' + recipient + '/inbox/'), {
        type: type,
        sender: currentUser.uid,
        post: key,
    });
}

function inboxBadge(visible) {
    document.querySelector('.inbox-badge').style.display = visible ? 'flex' : 'none';
}

function modalOverlay(visible, uid = null, key = null) {
    const modal = document.querySelector('.modal-overlay');

    if (visible) {
        document.querySelector('.modal-container').innerHTML = `
            <div class="modal-button" onclick="copy('https://looms.vercel.app/src/html/main.html#${uid}/${key}')"><p>Share</p><svg xmlns="http://www.w3.org/2000/svg" height="25px" viewBox="0 -960 960 960" width="25px" fill="var(--font-secundary)"><path d="M263.72-192Q234-192 213-213.15T192-264v-36q0-15.3 10.29-25.65Q212.58-336 227.79-336t25.71 10.35Q264-315.3 264-300v36h432v-36q0-15.3 10.29-25.65Q716.58-336 731.79-336t25.71 10.35Q768-315.3 768-300v36q0 29.7-21.16 50.85Q725.68-192 695.96-192H263.72ZM444-678l-80 80q-11 11-25.5 11t-25.98-11Q302-609 302-623.5t11-25.5l142-142q5.4-5 11.7-7.5 6.3-2.5 13.5-2.5t13.5 2.5Q500-796 505-791l142 142q11 11 11 25t-10.52 25Q636-588 621.5-588T596-599l-80-79v306q0 15.3-10.29 25.65Q495.42-336 480.21-336t-25.71-10.35Q444-356.7 444-372v-306Z"/></svg></div>
            ${uid === currentUser.uid ? `<div class="modal-button" onclick="deletePost('${key}'), modalOverlay(false);"><p>Delete</p><svg xmlns="http://www.w3.org/2000/svg" height="25px" viewBox="0 -960 960 960" width="25px" fill="var(--font-secundary)"><path d="M312-144q-30 0-51-21t-21-51v-480h-12q-15 0-25.5-10.5T192-732q0-15 10.5-25.5T228-768h156v-12q0-15 10.5-25.5T420-816h120q15 0 25.5 10.5T576-780v12h156q15 0 25.5 10.5T768-732q0 15-10.5 25.5T732-696h-12v480q0 30-21 51t-51 21H312Zm168-261 55 55q11 11 25.5 10.5T586-351q11-11 11-25.5T586-402l-55-54 55-55q11-11 11-25.5T586-562q-11-11-25.5-11T535-562l-55 55-55-55q-11-11-25-11t-25 11q-11 11-11 25.5t11 25.5l54 55-55 55q-11 11-10.5 25t11.5 25q11 11 25.5 11t25.5-11l54-54Z"/></svg></div>` : ''}
        `;

        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
    }
}

function toggleTheme() {
    localStorage.setItem('dark', document.documentElement.classList.toggle('dark') ? 'dark' : 'light');
}

function copy(data) {
    navigator.clipboard.writeText(data);
    alert(data);
}

for (const funcName in { loadView, toggleTheme, logOut, handleFileSelect, favoritePost, publish, reply, connection, copy, inboxBadge, modalOverlay, deletePost }) {
    window[funcName] = eval(funcName);
}