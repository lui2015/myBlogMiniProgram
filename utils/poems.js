const poemList = [
  {
    title: '静夜思',
    dynasty: '唐',
    author: '李白',
    lines: ['床前明月光，', '疑是地上霜。', '举头望明月，', '低头思故乡。']
  },
  {
    title: '登鹳雀楼',
    dynasty: '唐',
    author: '王之涣',
    lines: ['白日依山尽，', '黄河入海流。', '欲穷千里目，', '更上一层楼。']
  },
  {
    title: '春晓',
    dynasty: '唐',
    author: '孟浩然',
    lines: ['春眠不觉晓，', '处处闻啼鸟。', '夜来风雨声，', '花落知多少。']
  },
  {
    title: '望庐山瀑布',
    dynasty: '唐',
    author: '李白',
    lines: ['日照香炉生紫烟，', '遥看瀑布挂前川。', '飞流直下三千尺，', '疑是银河落九天。']
  },
  {
    title: '江雪',
    dynasty: '唐',
    author: '柳宗元',
    lines: ['千山鸟飞绝，', '万径人踪灭。', '孤舟蓑笠翁，', '独钓寒江雪。']
  },
  {
    title: '悯农',
    dynasty: '唐',
    author: '李绅',
    lines: ['锄禾日当午，', '汗滴禾下土。', '谁知盘中餐，', '粒粒皆辛苦。']
  },
  {
    title: '相思',
    dynasty: '唐',
    author: '王维',
    lines: ['红豆生南国，', '春来发几枝。', '愿君多采撷，', '此物最相思。']
  },
  {
    title: '夜雨寄北',
    dynasty: '唐',
    author: '李商隐',
    lines: ['君问归期未有期，', '巴山夜雨涨秋池。', '何当共剪西窗烛，', '却话巴山夜雨时。']
  },
  {
    title: '竹里馆',
    dynasty: '唐',
    author: '王维',
    lines: ['独坐幽篁里，', '弹琴复长啸。', '深林人不知，', '明月来相照。']
  },
  {
    title: '题西林壁',
    dynasty: '宋',
    author: '苏轼',
    lines: ['横看成岭侧成峰，', '远近高低各不同。', '不识庐山真面目，', '只缘身在此山中。']
  },
  {
    title: '饮湖上初晴后雨',
    dynasty: '宋',
    author: '苏轼',
    lines: ['水光潋滟晴方好，', '山色空蒙雨亦奇。', '欲把西湖比西子，', '淡妆浓抹总相宜。']
  },
  {
    title: '游山西村',
    dynasty: '宋',
    author: '陆游',
    lines: ['莫笑农家腊酒浑，', '丰年留客足鸡豚。', '山重水复疑无路，', '柳暗花明又一村。']
  }
]

let lastIndex = -1

function getRandomPoem() {
  let index
  do {
    index = Math.floor(Math.random() * poemList.length)
  } while (index === lastIndex && poemList.length > 1)
  lastIndex = index
  return poemList[index]
}

module.exports = {
  getRandomPoem
}
