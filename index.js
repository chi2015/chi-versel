/*TODO LIST: 

albums: optimize fields props, choosedate - list, move ok to choosedate (?)
playlist: css fixes
itunes100: fix 206 responses
main: remove consoles, refactoring

*/

const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
//const PORT = 3000 /* for local */
const PORT = process.env.PORT || 5000

const cool = require('cool-ascii-faces')
const menu = require('./menu')

const mysql = require('mysql')

const formidable = require('formidable')

const app = express()
  .use(express.static(path.join(__dirname, 'public')))
  .use(bodyParser.urlencoded({ extended: false }))
  .use('/albums', express.static(path.join(__dirname, 'albums')))
  .use('/playlist', express.static(path.join(__dirname, 'playlist')))
  .use('/itunes100', express.static(path.join(__dirname, 'itunes100')))
  .use('/itunes100/:country', express.static(path.join(__dirname, 'itunes100')))
  .use('/bbb', express.static(path.join(__dirname, 'bbb')))
  .use('/citadels', express.static(path.join(__dirname, 'citadels')))
  .use('/m-combinations', express.static(path.join(__dirname, 'm-combinations')))
  .use('/mafia-random-number', express.static(path.join(__dirname, 'mafia-random-number')))
  .use('/mafia-random-card', express.static(path.join(__dirname, 'mafia-random-card')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/upload-file', (req, res) => res.render('pages/upload'))
  .get('/chi', (req, res) => res.render('pages/chi', { menu }))
  .get('/cool', (req, res) => res.send(cool()))
  .post('/upload-new', async (req, res) => {
  	const Ftp = require('ftp')
		const ftpClient = new Ftp()
		ftpClient.on( 'ready', function() {
			const form = new formidable.IncomingForm()
			form.parse(req, function(err, fields, files) {
				ftpClient.put( files.upload_file.filepath, `/public_html/albums-covers/${files.upload_file.originalFilename}`, function( err, list ) {
				ftpClient.end()
				res.setHeader('Content-Type', 'application/json')
  				res.end(JSON.stringify(err ?  { error: 'Error file uploading' } : { ok: true }))
			})
		} )
	} )
	ftpClient.connect( {
		host: 'gator4255.hostgator.com',
		user: 'chitwofo',
		password: process.env.HOSTGATOR_PWAD,
	} )
  })
  .post('/api/albums-new', (req, res) => {
  	const form = new formidable.IncomingForm()
  	console.log('form', form)
  	form.parse(req, (err, fields, files) => {
  		console.log('parse', err, fields, files)
  		res.setHeader('Content-Type', 'application/json')
  		if (err) {
  			res.end(JSON.stringify({ error: 'Wrong request' }))
  			return
  		}
  		const { id, action, year, month, artist, title, itunes_link, copyright, pass } = fields
  		if (['add', 'edit'].indexOf(action) === -1) {
  			res.end(JSON.stringify({ error: 'Wrong action' }))
  			return
  		}
  		const con = mysql.createConnection({
  			host: "gator4255.hostgator.com",
  			database: "chitwofo_playlist",
  			user: "chitwofo_247",
  			password: process.env.HOSTGATOR_PWAD
  		})
  		con.connect(err => {
  			if (err) {
  				res.end(JSON.stringify({ error: 'Error connect to DB' }))
  				return
  			}
  			let query = ''
  			let conditions = ''
  			let coverFile = ''
  			const updateDB = () => {
  				let fieldsArr = ['artist', 'title', 'year', 'month', 'itunes_link', 'copyright']
  				if (coverFile) fieldsArr.push('cover')
  		    	const valuesStr = action === 'add' ? fieldsArr.map(f => f !== 'cover' ? fields[f].replaceAll("'", "''") : coverFile).join(`', '`) : fieldsArr.map(f => f !== 'cover' ? `${f}='${fields[f].replaceAll("'", "''")}'` : `cover='${coverFile}'`).join(', ')
  				query = action === 'add' ? `INSERT INTO albums (${fieldsArr.join(',')}) VALUES ('${valuesStr}')` : `UPDATE albums SET ${valuesStr} WHERE id=${id}`
  				console.log('change query', query)
  				con.query(query, (err, result) => {
  					res.end(JSON.stringify(err ? { error: 'Error updating albums'} : { ok: true, id: result.insertId, year, month }))
  					con.end()
  				})
  			}
  			switch (action) {
  				case 'list':
  					conditions = [{ field: 'year', value: year }, { field: 'month', value: month} ].filter(e => Boolean(parseInt(e.value))).map((e, i) => `${e.field}=${parseInt(e.value)}`).join(' AND ')
  					query = `SELECT id, artist, title, year, month, itunes_link, cover, copyright FROM albums${conditions ? ` WHERE ${conditions}` : ''}`
  					con.query(query, (err, result) => {
  						res.end(JSON.stringify(err ? { error: 'Error retrieving albums list' } : { ok: true, albums: result }))
  						con.end()
  					})
  					break
  				case 'add':
  				case 'edit':
  					if (pass !== process.env.EDIT_PWAD) {
  						res.end(JSON.stringify({ error: 'Wrong password' }))
  						return
  					}
  					const { cover } = files
  					console.log('cover', cover)
  					if (cover) {
  						const Ftp = require('ftp')
  						const ftpClient = new Ftp()
  						ftpClient.on('ready', () => {
  							console.log('put file')
  							coverFile = `${year}_${month}_${Date.now()}`
  							ftpClient.put(cover.filepath, `/public_html/albums-covers/${coverFile}`, (err, list) => {
  								console.log('put file cbk')
  								ftpClient.end()
  								if (err) {
  								    console.log('error uploading file', err)
  								    con.end()
  									res.end(JSON.stringify({ error: 'Error uploading file' }))
  									return
  								}
  								updateDB()
  							})
  						})
  						ftpClient.connect( {
							host: 'gator4255.hostgator.com',
							user: 'chitwofo',
							password: process.env.HOSTGATOR_PWAD, 
						} )
  					} else updateDB()
  					break
  				case 'delete':
  					if (pass !== process.env.EDIT_PWAD) {
  						res.end(JSON.stringify({ error: 'Wrong password' }))
  						return
  					}
  					query = `DELETE FROM albums WHERE id=${id}`
  					console.log('query delete', query)
  					con.query(query, (err, result) => {
  						res.end(JSON.stringify(err ? { error: 'Error deleting album' } : { ok: true, id }))
  						con.end()
  					})
  		
  			}
  			
  		})
  	})
  })
  .post('/api/albums', (req, res) => {
  	const { id, action, year, month, pass } = req.body
  	if (['list', 'delete'].indexOf(action) === -1) {
  			res.end(JSON.stringify({ error: 'Wrong action' }))
  			return
  		}
  	const con = mysql.createConnection({
  		host: "gator4255.hostgator.com",
  		database: "chitwofo_playlist",
  		user: "chitwofo_247",
  		password: process.env.HOSTGATOR_PWAD
  	})
  	con.connect(err => {
  		if (err) {
  		 con.end()
  		 res.end(JSON.stringify({ error: 'Uknown error'}))
  		 return
  		}
  		let conditions = ''
  		let query = ''
  		res.setHeader('Content-Type', 'application/json')
  		
  		console.log('req', req.body)
  		switch (action) {
  			case 'list':
  				conditions = [{ field: 'year', value: year }, { field: 'month', value: month} ].filter(e => Boolean(parseInt(e.value))).map((e, i) => `${e.field}=${parseInt(e.value)}`).join(' AND ')
  				query = `SELECT id, artist, title, year, month, itunes_link, cover, copyright FROM albums${conditions ? ` WHERE ${conditions}` : ''}`
  				con.query(query, (err, result) => {
  					res.end(JSON.stringify(err ? { error: 'Error get albums list'} : { ok: true, albums: result }))
  					con.end()
  				})
  				break
  			case 'delete':
  					if (pass !== process.env.EDIT_PWAD) {
  						con.end()
  						res.end(JSON.stringify({ error: 'Wrong password' }))
  						return
  					}
  					query = `DELETE FROM albums WHERE id=${id}`
  					console.log('query delete', query)
  					con.query(query, (err, result) => {
  						res.end(JSON.stringify(err ? { error: 'Error deleting album' } : { ok: true, id }))
  						con.end()
  					})
	}
	
  })
  })
  .post('/api/playlist', (req, res) => {
  	console.log('req', req.body)
  	res.setHeader('Content-Type', 'application/json')
  	const { action, current_date, pl_date, year, password, data } = req.body
  	
  	const con = mysql.createConnection({
  		host: "gator4255.hostgator.com",
  		database: "chitwofo_playlist",
  		user: "chitwofo_247",
  		password: process.env.HOSTGATOR_PWAD,
  		dateStrings: true
  	})
  	
  	const pl_get = date => {
  		const query_get = `SELECT songs.id, songs.artist, songs.title, songs.date_appear, playlist.score
		FROM songs
		LEFT JOIN playlist ON songs.id = playlist.song_id
		WHERE playlist.pl_date = '${date}'
		ORDER BY playlist.score DESC , songs.artist ASC`
			console.log('query get', query_get)
			con.query(query_get, (err, result) => {
  				res.end(JSON.stringify(err ? {error: 'Error get playlist data'} : { ok: true, date: date, list: result }))
  				con.end()
			})
  	}
  	
  	const isLeapYear = y => ((y % 4 == 0) && (y % 100 != 0)) || (y % 400 == 0)
  	
  	const check_bonus = cbk => {
  		const query_bonus = `SELECT COUNT(1) AS cnt FROM bonuses WHERE max_date >= '${year}-01-01'` 
  		con.query(query_bonus, (err, result) => {
  			if (err) {
  				con.end()
  				res.end(JSON.stringify({ error: 'Error '}))
  				return
  			}
  			console.log('res', result, result[0].cnt)
  			if (result[0].cnt === 0) {
  				const lastFeb = isLeapYear(year) && 29 || 28
  				const query_ins_bonus = `INSERT INTO bonuses (max_date, bonus) VALUES ('${year}-01-01', 150), ('${year}-01-31', 135), ('${year}-02-${lastFeb}', 120), ('${year}-03-31', 105), ('${year}-04-30', 90), ('${year}-05-31', 75), ('${year}-06-30', 150), ('${year}-07-31', 120), ('${year}-08-31', 90), ('${year}-09-30', 60), ('${year}-10-31', 30), ('${year}-11-30', 0)`
  				console.log('insert bonuses')
  				con.query(query_ins_bonus, (err, result) => {
  					if (err) {
  						con.end()
  						res.end(JSON.stringify({ error: 'Error '}))
  						return
  					}
  					cbk()
  				})
  			} else {
  				cbk()
  			}
  		})
  	}
  	
  	const monthStrs = {
  		January: '01',
  		February: '02',
  		March: '03',
  		April: '04',
  		May: '05',
  		June: '06',
  		July: '07',
  		August: '08',
  		September: '09',
  		October: '10',
  		November: '11',
  		December: '12'
  	}
  	
  	const getPlaylistDate = dateStr => {
  		const [day, month, year] = dateStr.trim().substring(8).split(' ')
  		return `${year}-${monthStrs[month]}-${parseInt(day) < 10 ? `0${parseInt(day)}` : parseInt(day)}`
  	}
  	
  	const A_COUNT = 9, B_COUNT = 10, C_COUNT = 6
  	const A_SCORE = 47, B_SCORE = 28, C_SCORE = 23
  	const A_OFFSET = 4, B_OFFSET = 16, C_OFFSET = 29
  	
  	const preparePlaylist = pl_data => {
  		const dataArr = pl_data.split('\n')
  		if (dataArr[0].indexOf('Playlist') !== 0) {
  			res.end(JSON.stringify({ error: 'Wrong playlist format' }))
  			return false
  		}
  		const date = getPlaylistDate(dataArr[1])
  		const songs = [...prepareBlock(dataArr, A_OFFSET, A_COUNT, A_SCORE), ...prepareBlock(dataArr, B_OFFSET, B_COUNT, B_SCORE), ...prepareBlock(dataArr, C_OFFSET, C_COUNT, C_SCORE)]
		return { date, songs }
  	}
  	
  	const escapeHtml = text => text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  	
  	const prepareBlock = (arr, offset, count, score) => {
  		let = ret = []
  		for (let i = offset; i<offset+count; i++) {
  			const is_new = arr[i].indexOf('*') === 0
  			const song = arr[i].replace('*', '').replace(/(.+)\s(feat\.\s.+)(\s-\s.+)/, "$1$3 ($2)")
  			const [artist, title] = song.split(' - ').map(escapeHtml)
  			ret.push({ artist, title, score, is_new })
  		}
  		return ret
  	}
  	
  	const insertPlaylistItem = (song_id, date, score, is_new) => {
  		const ins_query = `INSERT INTO playlist (song_id, pl_date, score) VALUES ('${song_id}', '${date}', '${score}')`
  		con.query(ins_query, (err, res) => {
  			if (err) {
  				con.end()
  				res.end(JSON.stringify({ error: 'Error adding playlist'}))
  				return
  			}
  			if (is_new) {
  				const upd_query = `UPDATE songs SET date_appear = '${date}' WHERE id = ${song_id}`
  				con.query(upd_query, (err, res_upd) => {
  					if (err) {
  						con.end()
  						res.end(JSON.stringify({ error: 'Error updating playlist'}))
  						return
  					}
  					updateInsertedCount(date)
  				})
  			} else {
  				updateInsertedCount(date)
  			}
  		})
  	}
  	
  	let count_inserted = 0
  	
  	const updateInsertedCount = date => {
  		count_inserted++
  		if (count_inserted === A_COUNT + B_COUNT + C_COUNT) {
  			con.end()
  			res.end(JSON.stringify({ ok: true, pl_date: date }))
  		}
  	}
  	  	
  	let query = ''
  	
  	
  	switch (action) {
  		case 'current':
  		case 'latest':
  			con.connect(err => {
  				if (err) {
  				con.end()
  				res.end(JSON.stringify({ error: 'Could not connect database' }))
  				return
  				}
  				const latest = action === 'latest'
  				query = latest ? `SELECT MAX(pl_date) AS pl_date
									FROM playlist` :
								   `SELECT DISTINCT pl_date
									FROM playlist
									WHERE pl_date <= ${current_date ? `'${current_date}'` : `NOW()`} ORDER BY pl_date DESC LIMIT 1`
				console.log('query', query)
				con.query(query, (err, result) => {
					if (err) {
						con.end()
						res.end(JSON.stringify({ error: 'Error get playlist date query' }))
						return
					}
  					console.log('result', result)
  					if (result.length === 0) {
  						con.end()
  						res.end(JSON.stringify({ error: `Playlist dated ${current_date} does not exist` }))
  						return
  					}
  					pl_get(result[0].pl_date)
				})
  			})
  			break
  		case 'prev':
  		case 'next':
  			con.connect(err => {
  				if (err) {
  				con.end()
  				res.end(JSON.stringify({ error: 'Could not connect database' }))
  				return
  				}
  				const is_prev = action === 'prev'
  				const less_or_more = is_prev ? "<" : ">"
    			const sort_order = is_prev ? "DESC" : "ASC"
  				query = `SELECT DISTINCT pl_date
									FROM playlist
									WHERE pl_date ${less_or_more} '${pl_date}' ORDER BY pl_date ${sort_order} LIMIT 1`
				console.log('query', query)
				con.query(query, (err, result) => {
					if (err) {
						con.end()
						res.end(JSON.stringify({ error: 'Error get playlist date query' }))
						return
					}
  					if (result.length === 0) {
  						con.end()
  						const errWhat = is_prev ? 'oldest' : 'latest'
  						res.end(JSON.stringify({ error: `This is the ${errWhat} playlist` }))
  						return
  					}
  					pl_get(result[0].pl_date)
				})
  			})
  			break
  		case 'top100':
  			con.connect(err => {
  				if (err) {
  					con.end()
  					res.end(JSON.stringify({ error: 'Could not connect database' }))
  					return
  				}
  				check_bonus(() => {
  					query = `SELECT songs.artist AS artist, songs.title AS title, SUM( playlist.score ) + (
SELECT bonus
FROM bonuses
WHERE max_date < date_add( MAX( playlist.pl_date ) , INTERVAL 6
DAY )
ORDER BY max_date DESC
LIMIT 1 ) AS total,
MAX(playlist.score) AS max_score
FROM songs
INNER JOIN playlist ON playlist.song_id = songs.id
WHERE playlist.pl_date
BETWEEN '${year}-01-01'
AND '${year}-12-31'
GROUP BY songs.id
ORDER BY total DESC , artist ASC
LIMIT 100`

  			
  			con.query(query, (err, result) => {
				if (err) {
					con.end()
					res.end(JSON.stringify({ error: 'Error get top 100 data' }))
					return
				}
				if (result.length === 0) {
					con.end()
					res.end(JSON.stringify({ error: 'No data for top 100 that year' }))
					return
				}
  				res.end(JSON.stringify({ ok: true, year, list: result }))
  				con.end()
			})
    })
  				
  				})
  				
  			break
			
			case 'top10artists':
			
			con.connect(err => {
  				if (err) {
  					con.end()
  					res.end(JSON.stringify({ error: 'Could not connect database' }))
  					return
  				}
  				check_bonus(() => {
  					query = `SELECT artist, SUM(total) AS artist_total, COUNT(title) AS songs FROM (SELECT songs.artist AS artist, songs.title AS title, SUM( playlist.score ) + (
SELECT bonus
FROM bonuses
WHERE max_date < date_add( MAX( playlist.pl_date ) , INTERVAL 6
DAY )
ORDER BY max_date DESC
LIMIT 1 ) AS total
FROM songs
INNER JOIN playlist ON playlist.song_id = songs.id
WHERE playlist.pl_date
BETWEEN '${year}-01-01'
AND '${year}-12-31'
GROUP BY songs.id
ORDER BY total DESC , artist ASC
) top100 GROUP BY top100.artist ORDER BY artist_total DESC LIMIT 10`

  			
  			con.query(query, (err, result) => {
				if (err) {
					con.end()
					res.end(JSON.stringify({ error: 'Error get top 10 artists data' }))
					return
				}
				if (result.length === 0) {
					con.end()
					res.end(JSON.stringify({ error: 'No data for top 10 that year' }))
					return
				}
  				res.end(JSON.stringify({ ok: true, year, list: result }))
  				con.end()
			})
    })
  				
  				
  				})
  				
  			break
  		case 'upload':
  				const { songs, date } = preparePlaylist(data)
  				if (!songs || !date) return
  				const query_date = `SELECT COUNT(pl_date) AS cnt FROM playlist WHERE pl_date='${date}'`
  				console.log('query date', query_date)
  				con.query(query_date, (err, result) => {
  				 if (err) {
  				 	con.end()
					res.end(JSON.stringify({ error: 'Error' }))
					return
  				 }
  				 if (result[0].cnt > 0) {
  				 con.end()
  					res.end(JSON.stringify({ error: `Playlist dated ${date} already exists` }))
  					return
  				 } else {
  				 songs.forEach(({ artist, title, is_new, score }) => {
  					const query_select_song_id = `SELECT id FROM songs WHERE title = '${title}' AND artist = '${artist}'`
  					console.log('query select', query_select_song_id )
  					con.query(query_select_song_id, (err, result) => {
  						if (err) {
  							con.end()
							res.end(JSON.stringify({ error: 'Error' }))
							return
  						}
  						let songId
  						console.log('result', result)
  						if (result.length > 0) {
  							songId = result[0].id
  							insertPlaylistItem(songId, date, score, is_new)
  						} else {
  							const query_insert_song = `INSERT INTO songs (title, artist) VALUES ('${title}', '${artist}')`
  							console.log('query insert', query_insert_song )
  							con.query(query_insert_song, (err, result_ins) => {
  								if (err) {
  									con.end()
  									res.end(JSON.stringify({ error: 'Error' }))
  								}
  								songId = result_ins.insertId
  								insertPlaylistItem(songId, date, score, is_new)
  							})
  						}
  					})
  				})
  				 }
  				
  				})
  				
  				break
  		case 'delete':
  			if (password !== process.env.EDIT_PWAD) {
  				res.end(JSON.stringify({ error: 'Wrong password'}))
  				return
  			}
  			con.connect(err => {
  				if (err) {
  					con.end()
  					res.end(JSON.stringify({ error: 'Could not connect database' }))
  					return
  				}
  				const query_songs = `SELECT song_id, COUNT(1) AS cnt FROM playlist GROUP BY song_id HAVING cnt = 1 AND MAX(pl_date) = '${pl_date}'`
  				con.query(query_songs, (err, songs) => {
  					if (err) {
  						con.end()
						res.end(JSON.stringify({ error: 'Error' }))
						return
  					}
  					const query_del = `DELETE FROM playlist WHERE pl_date='${pl_date}'`
  					con.query(query_del, (err, result) => {
  						if (err) {
  							con.end()
							res.end(JSON.stringify({ error: 'Error' }))
							return
  						}
  						console.log('songs', songs.length)
  						if (songs.length > 0) {
  							const query_del_songs = `DELETE FROM songs WHERE id IN (${songs.map(s => s.song_id).join(', ')})`
  							console.log('query del songs', query_del_songs)
  							con.query(query_del_songs, (err, result) => {
  								con.end()
  								res.end(JSON.stringify(err ? { error: 'Error' } : { ok: true }))
  							})
  						} else {
  							con.end()
  							res.end(JSON.stringify({ ok: true }))
  						}
  					})
  				})
  			})
  			break
  		default:
  			con.end()
  			res.end(JSON.stringify({ error: 'Wrong action' }))
  	}
  })

module.exports = app

if (require.main === module) {
  app.listen(PORT, () => console.log(`Listening on ${ PORT }`))
}
