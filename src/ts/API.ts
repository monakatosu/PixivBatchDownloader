import {
  UserImageWorksWithTag,
  BookmarkData,
  UserProfile,
  UserProfileAllData,
  ArtworkData,
  UgoiraData,
  RecommendData,
  RankingData,
  RecommenderData,
  SearchData,
  NewIllustData,
  BookMarkNewData,
  UserNovelsWithTag,
  NovelData,
  NovelSeriesData,
  NovelSearchData,
  NewNovelData,
  FollowingResponse,
  SeriesData,
  muteData,
} from './crawl/CrawlResult'

import {
  userWorksType,
  RankingOption,
  SearchOption,
  NewIllustOption,
  tagPageFlag,
} from './crawl/CrawlArgument'

import { IDData } from './store/StoreType'

/** 点击 like 按钮的返回数据 */
interface LikeResponse {
  error: boolean
  message: '' | string
  body:
    | []
    | {
        is_liked: boolean
      }
}

class API {
  // 发送 get 请求，返回 json 数据，抛出异常
  static sendGetRequest<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      fetch(url, {
        method: 'get',
        credentials: 'same-origin',
      })
        .then((response) => {
          if (response.ok) {
            return response.json()
          } else {
            // 第一种异常，请求成功但状态不对
            reject({
              status: response.status,
              statusText: response.statusText,
            })
          }
        })
        .then((data) => {
          resolve(data)
        })
        .catch((error) => {
          // 第二种异常，请求失败
          reject(error)
        })
    })
  }

  // 获取收藏数据
  // 这个 api 返回的作品列表顺序是按收藏顺序由近期到早期排列的
  static async getBookmarkData(
    id: string,
    type: 'illusts' | 'novels' = 'illusts',
    tag: string,
    offset: number,
    hide: boolean = false
  ): Promise<BookmarkData> {
    const url = `https://www.pixiv.net/ajax/user/${id}/${type}/bookmarks?tag=${tag}&offset=${offset}&limit=100&rest=${
      hide ? 'hide' : 'show'
    }&rdm=${Math.random()}`

    return this.sendGetRequest(url)
  }

  // 添加收藏
  static async addBookmark(
    type: 'illusts' | 'novels',
    id: string,
    tags: string[],
    hide: boolean,
    token: string
  ) {
    const restrict: 1 | 0 = hide ? 1 : 0

    let body = {}
    if (type === 'illusts') {
      body = {
        comment: '',
        illust_id: id,
        restrict: restrict,
        tags: tags,
      }
    } else {
      body = {
        comment: '',
        novel_id: id,
        restrict: restrict,
        tags: tags,
      }
    }

    return fetch(`https://www.pixiv.net/ajax/${type}/bookmarks/add`, {
      method: 'POST',
      credentials: 'same-origin', // 附带 cookie
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        'x-csrf-token': token,
      },
      body: JSON.stringify(body),
    })
  }

  // 获取关注的用户列表
  static getFollowingList(
    id: string,
    rest: 'show' | 'hide' = 'show',
    offset = 0,
    limit = 100,
    tag = '',
    lang = 'zh'
  ): Promise<FollowingResponse> {
    const url = `https://www.pixiv.net/ajax/user/${id}/following?offset=${offset}&limit=${limit}&rest=${rest}&tag=${tag}&lang=${lang}`
    return this.sendGetRequest(url)
  }

  // 获取好 P 友列表
  static getMyPixivList(
    id: string,
    offset = 0,
    limit = 100,
    lang = 'zh'
  ): Promise<FollowingResponse> {
    const url = `https://www.pixiv.net/ajax/user/${id}/mypixiv?offset=${offset}&limit=${limit}&lang=${lang}`
    return this.sendGetRequest(url)
  }

  // 获取粉丝列表
  static getFollowersList(
    id: string,
    offset = 0,
    limit = 100,
    lang = 'zh'
  ): Promise<FollowingResponse> {
    const url = `https://www.pixiv.net/ajax/user/${id}/followers?offset=${offset}&limit=${limit}&lang=${lang}`
    return this.sendGetRequest(url)
  }

  // 获取用户信息
  static getUserProfile(id: string): Promise<UserProfile> {
    // full=1 在画师的作品列表页使用，获取详细信息
    // full=0 在作品页内使用，只获取少量信息
    const url = `https://www.pixiv.net/ajax/user/${id}?full=1`
    return this.sendGetRequest(url)
  }

  // 获取用户指定类型的作品列表
  // 返回作品的 id 列表，不包含详细信息
  static async getUserWorksByType(
    id: string,
    type: userWorksType[] = ['illusts', 'manga', 'novels']
  ): Promise<IDData[]> {
    let typeSet = new Set(type)
    let result: IDData[] = []
    const url = `https://www.pixiv.net/ajax/user/${id}/profile/all`

    let data: UserProfileAllData = await this.sendGetRequest(url)
    for (const type of typeSet.values()) {
      const idList = Object.keys(data.body[type])
      for (const id of idList) {
        result.push({
          type,
          id,
        })
      }
    }

    return result
  }

  // 获取用户指定类型、并且指定 tag 的作品列表
  // 返回整个请求的结果，里面包含作品的详细信息
  // 必须带 tag 使用。不带 tag 虽然也能获得数据，但是获得的并不全，很奇怪。
  static getUserWorksByTypeWithTag(
    id: string,
    type: tagPageFlag,
    tag: string,
    offset: number = 0,
    limit: number = 999999
  ): Promise<UserImageWorksWithTag | UserNovelsWithTag> {
    // https://www.pixiv.net/ajax/user/2369321/illusts/tag?tag=Fate/GrandOrder&offset=0&limit=9999999
    const url = `https://www.pixiv.net/ajax/user/${id}/${type}/tag?tag=${tag}&offset=${offset}&limit=${limit}`
    return this.sendGetRequest(url)
  }

  // 获取插画 漫画 动图 的详细信息
  static getArtworkData(id: string): Promise<ArtworkData> {
    const url = `https://www.pixiv.net/ajax/illust/${id}`
    return this.sendGetRequest(url)
  }

  // 获取动图的元数据
  static getUgoiraMeta(id: string): Promise<UgoiraData> {
    const url = `https://www.pixiv.net/ajax/illust/${id}/ugoira_meta`
    return this.sendGetRequest(url)
  }

  // 获取小说的详细信息
  static getNovelData(id: string): Promise<NovelData> {
    const url = `https://www.pixiv.net/ajax/novel/${id}`
    return this.sendGetRequest(url)
  }

  // 获取相关作品
  static getRelatedData(id: string): Promise<RecommendData> {
    // 最后的 18 是预加载首屏的多少个作品的信息，和下载并没有关系
    const url = `https://www.pixiv.net/ajax/illust/${id}/recommend/init?limit=18`
    return this.sendGetRequest(url)
  }

  // 获取排行榜数据
  // 排行榜数据基本是一批 50 条作品信息
  static getRankingData(option: RankingOption): Promise<RankingData> {
    let url = `https://www.pixiv.net/ranking.php?mode=${option.mode}&p=${option.p}&format=json`

    // 把可选项添加到 url 里
    let temp = new URL(url)

    // 下面两项需要判断有值再添加。不可以添加了这些字段却使用空值。
    if (option.worksType) {
      temp.searchParams.set('content', option.worksType)
    }
    if (option.date) {
      temp.searchParams.set('date', option.date)
    }

    url = temp.toString()

    return this.sendGetRequest(url)
  }

  // 获取收藏后的相似作品数据
  // 需要传入作品 id 和要抓取的数量。但是实际获取到的数量会比指定的数量少一些
  static getRecommenderData(
    id: string,
    number: number
  ): Promise<RecommenderData> {
    const url = `/rpc/recommender.php?type=illust&sample_illusts=${id}&num_recommendations=${number}`
    return this.sendGetRequest(url)
  }

  // 获取搜索数据
  static getSearchData(
    word: string,
    type: string = 'artworks',
    p: number = 1,
    option: SearchOption = {}
  ): Promise<SearchData> {
    // 基础的 url
    let url = `https://www.pixiv.net/ajax/search/${type}/${encodeURIComponent(
      word
    )}?word=${encodeURIComponent(word)}&p=${p}`

    // 把可选项添加到 url 里
    let temp = new URL(url)
    for (const [key, value] of Object.entries(option)) {
      if (value) {
        temp.searchParams.set(key, value)
      }
    }
    url = temp.toString()

    return this.sendGetRequest(url)
  }

  static getNovelSearchData(
    word: string,
    p: number = 1,
    option: SearchOption = {}
  ): Promise<NovelSearchData> {
    // 基础的 url
    let url = `https://www.pixiv.net/ajax/search/novels/${encodeURIComponent(
      word
    )}?word=${encodeURIComponent(word)}&p=${p}`

    // 把可选项添加到 url 里
    let temp = new URL(url)
    for (const [key, value] of Object.entries(option)) {
      if (value) {
        temp.searchParams.set(key, value)
      }
    }
    url = temp.toString()

    return this.sendGetRequest(url)
  }

  // 获取大家的新作品的数据
  static getNewIllustData(option: NewIllustOption): Promise<NewIllustData> {
    let url = `https://www.pixiv.net/ajax/illust/new?lastId=${option.lastId}&limit=${option.limit}&type=${option.type}&r18=${option.r18}`
    return this.sendGetRequest(url)
  }

  // 获取大家的新作小说的数据
  static getNewNovleData(option: NewIllustOption): Promise<NewNovelData> {
    let url = `https://www.pixiv.net/ajax/novel/new?lastId=${option.lastId}&limit=${option.limit}&r18=${option.r18}`
    return this.sendGetRequest(url)
  }

  // 获取关注的的新作品的数据
  static getBookmarkNewIllustData(
    p = 1,
    r18 = false
  ): Promise<{
    lastPage: boolean
    data: BookMarkNewData[]
  }> {
    let path = r18 ? 'bookmark_new_illust_r18' : 'bookmark_new_illust'

    let url = `https://www.pixiv.net/${path}.php?p=${p}`

    return new Promise((resolve, reject) => {
      fetch(url, {
        method: 'get',
        credentials: 'same-origin',
      })
        .then((response) => {
          if (response.ok) {
            return response.text()
          } else {
            throw new Error(response.status.toString())
          }
        })
        .then((data) => {
          let listPageDocument = new DOMParser().parseFromString(
            data,
            'text/html'
          )

          // 查找是否有下一页的按钮，如果没有说明是最后一页了，不再继续抓取下一页
          let lastPage = false
          if (!listPageDocument.querySelector('span.next a')) {
            lastPage = true
          }

          let worksInfoText = (
            listPageDocument.querySelector(
              '#js-mount-point-latest-following'
            ) as HTMLDivElement
          ).dataset.items!

          resolve({
            lastPage,
            data: JSON.parse(worksInfoText),
          })
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  // 根据 illustType，返回作品类型的描述
  // 主要用于储存进 idList
  static getWorkType(
    illustType: 0 | 1 | 2 | 3 | '0' | '1' | '2' | '3'
  ): 'illusts' | 'manga' | 'ugoira' | 'novels' | 'unknown' {
    switch (parseInt(illustType.toString())) {
      case 0:
        return 'illusts'
      case 1:
        return 'manga'
      case 2:
        return 'ugoira'
      case 3:
        return 'novels'
      default:
        return 'unknown'
    }
  }

  // 从 URL 中获取指定路径名的值，适用于符合 RESTful API 风格的路径
  // 如 https://www.pixiv.net/novel/series/1090654
  // 把路径用 / 分割，查找 key 所在的位置，后面一项就是它的 value
  static getURLPathField(query: string) {
    const pathArr = location.pathname.split('/')
    const index = pathArr.indexOf(query)
    if (index > 0) {
      return pathArr[index + 1]
    }

    throw new Error(`getURLPathField ${query} failed!`)
  }

  // 获取小说的系列作品信息
  // 这个 api 目前一批最多只能返回 30 个作品的数据，所以可能需要多次获取
  static getNovelSeriesData(
    series_id: number | string,
    limit: number = 30,
    last_order: number,
    order_by = 'asc'
  ): Promise<NovelSeriesData> {
    const url = `https://www.pixiv.net/ajax/novel/series_content/${series_id}?limit=${limit}&last_order=${last_order}&order_by=${order_by}`
    return this.sendGetRequest(url)
  }

  // 获取系列信息
  // 这个接口的数据结构里同时有 illust （包含漫画）和 novel 系列数据
  // 恍惚记得有插画系列来着，但是没找到对应的网址，难道是记错了？
  static getSeriesData(
    series_id: number | string,
    pageNo: number
  ): Promise<SeriesData> {
    const url = `https://www.pixiv.net/ajax/series/${series_id}?p=${pageNo}`
    return this.sendGetRequest(url)
  }

  // 点赞
  static async addLike(
    id: string,
    type: 'illusts' | 'novels',
    token: string
  ): Promise<LikeResponse> {
    let data = {}
    if (type === 'illusts') {
      data = {
        illust_id: id,
      }
    } else {
      data = {
        novel_id: id,
      }
    }
    const r = await fetch(`https://www.pixiv.net/ajax/${type}/like`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        'x-csrf-token': token,
      },
      credentials: 'same-origin',
      body: JSON.stringify(data),
    })
    const json = (await r.json()) as LikeResponse
    return json
  }

  static async getMuteSettings(): Promise<muteData> {
    return this.sendGetRequest(
      `https://www.pixiv.net/ajax/mute/items?context=setting`
    )
  }
}

export { API }
