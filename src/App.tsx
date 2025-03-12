import { Fragment, useEffect, useState } from 'react'
import './App.css'
import {
  Avatar, Box, Button, CircularProgress, Collapse, IconButton, List, ListItem,
  ListItemAvatar, ListItemButton, ListItemText, Paper, TextField, Typography
} from '@mui/material'
import {
  CloseRounded, ExpandLessRounded, ExpandMoreRounded
} from '@mui/icons-material'
import { Octokit } from 'octokit'
import { User } from './models/User'

function App() {
  const octokit = new Octokit({
    auth: import.meta.env.VITE_GITHUB_TOKEN
  })
  const maxRepoPerPage = 100
  const maxUserResults = 5
  const [error, setError] = useState(false)
  const [listOfOpens, setListOfOpens] = useState<boolean[]>([])
  const [loadingRepo, setLoadingRepo] = useState<{ [key: string]: boolean }>({})
  const [loadingUser, setLoadingUser] = useState(false)
  const [repos, setRepos] = useState<{ [key: string]: any[] }>({})
  const [searchValue, setSearchValue] = useState('')
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    const newListOfOpens = []
    
    for (let index = 0; index < maxUserResults; index++) {
      newListOfOpens.push(false)
    }

    setListOfOpens(newListOfOpens)
  }, [maxUserResults])

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError(false)
    setSearchValue(event.target.value)
  }

  function handleClear() {
    setSearchValue('')
    document.getElementById('search')?.focus()
  }

  async function fetchRepos(username: string) {
    setLoadingRepo((prev) => ({ ...prev, [username]: true }))

    try {
      let userRepos: any[] = []
      let page = 1
      let hasMore = true

      while (hasMore) {
        const response = await octokit.request(`GET /users/${username}/repos`, {
          per_page: maxRepoPerPage,
          page: page
        })

        if (response.status != 200) {
          return
        }

        if (0 < response.data?.length) {
          userRepos = [...userRepos, ...response.data]

          if (response.data.length == maxRepoPerPage) {
            page++
          } else {
            hasMore = false
          }
        } else {
          hasMore = false
        }
      }

      setRepos((prev) => ({ ...prev, [username]: userRepos }))
    } catch (error) {
      console.error(error)
    }

    setLoadingRepo((prev) => {
      const newValue = {...prev}
      newValue[username] = false
      return newValue
    })
  }

  async function handleSearch() {
    if (searchValue == '') {
      setError(true)
      return
    }

    setLoadingUser(true)
    setListOfOpens((prev) => prev.map(() => false))
    
    try {
      const response = await octokit.request('GET /search/users', {
        q: searchValue,
        per_page: maxUserResults
      })

      if (response.status != 200) {
        return
      }
      
      setUsers(response.data.items)

      response.data.items.forEach(element => {
        fetchRepos(element.login)
      });
    } catch (error) {
      console.error('Error searching users:', error)
    }

    setLoadingUser(false)
  }

  async function handleRepos(index: number) {
    setListOfOpens((prev) => prev.map((value, i) => i == index ? !value : false))
    if (listOfOpens[index]) {
      return
    }
  }

  return (
    <>
      <Typography fontWeight={600} mb={6} variant='h4'>
        {'Search GitHub Users'}
      </Typography>
      <Box component={Paper} bgcolor={'#f6f6f6'} borderRadius={6} display={'flex'}
        minWidth={450}
      >
        <TextField id='search' autoFocus autoComplete='off' focused fullWidth
          onChange={handleChange}
          onKeyDown={(event) => event.key == 'Enter' && handleSearch()}
          placeholder='Search' size='small'
          slotProps={{ input: { sx: { borderRadius: 5 } } }}
          sx={{ 'fieldset': { display: 'none' } }} value={searchValue}
        />
        {searchValue != '' ? (
          <IconButton onClick={handleClear}>
            <CloseRounded/>
          </IconButton>
        ) : (
          <Box component={'div'} width={50}/>
        )}
        <Button onClick={handleSearch}
          sx={{ borderRadius: 5, fontWeight: 600, px: 3, textTransform: 'none' }}
          variant='contained'
        >
          {'Search'}
        </Button>
      </Box>
      <Typography variant='caption'>
        {error && 'Type something to search'}
      </Typography>
      {loadingUser ? (
        <Box component={Paper} bgcolor={'#f6f6f6'} borderRadius={7} display={'flex'}
          justifyContent={'center'} justifySelf={'center'} mt={2} p={1}
        >
          <CircularProgress size={'2rem'}/>
        </Box>
      ) : (
        <List sx={{ mt: 4 }}>
          {users.map((user, index) => (
            <Fragment key={user.id}>
              <ListItemButton onClick={() => handleRepos(index)}
                sx={{ bgcolor: '#f6f6f6', borderRadius: 3, boxShadow: 1, mt: 1 }}
              >
                <ListItemAvatar>
                  <Avatar src={user.avatar_url}/>
                </ListItemAvatar>
                <ListItemText primary={user.login} secondary={user.login}/>
                {listOfOpens[index] ? <ExpandLessRounded/> : <ExpandMoreRounded/>}
              </ListItemButton>
              <Collapse in={listOfOpens[index]} timeout="auto" unmountOnExit>
                <Box bgcolor={'#f9f9f9'} component={'div'} maxHeight={'50vh'} overflow={'auto'}
                  sx={{ scrollbarWidth: 'thin' }}
                >
                  {loadingRepo[user.login] && (
                    <Box component={Paper} borderRadius={7} display={'flex'}
                      justifyContent={'center'} justifySelf={'center'} mt={2} p={1}
                    >
                      <CircularProgress size={'2rem'}/>
                    </Box>
                  )}
                  {repos[user.login]?.length == 0 ? (
                    <Typography my={1}>
                      {'No Repository.'}
                    </Typography>
                  ) : (
                    <List>
                      {repos[user.login]?.map((repo) => (
                        <ListItem key={repo.id}>
                          <ListItemText primary={repo.name}/>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              </Collapse>
            </Fragment>
          ))}
        </List>
      )}
    </>
  )
}

export default App
