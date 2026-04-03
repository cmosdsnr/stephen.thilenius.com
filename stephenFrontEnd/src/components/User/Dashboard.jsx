import React from 'react'
import { Row, Col, Card, Button } from 'react-bootstrap'

import { useData } from '../../contexts/DataContext'
import { Link, useNavigate } from 'react-router-dom'
import './Dashboard.css'
import { AdminMenu } from '../Administrator/AdminMenu'
import Avatar from './Avatar'


export default function Dashboard() {
    const { pb } = useData();
    const navigate = useNavigate()

    return (
        <>
            {pb.authStore.isValid ?
                <>
                    <AdminMenu offset={0} span={12} />
                    <div className='w-100 mx-auto pt-4' style={{ maxWidth: "500px" }}>
                        <Card>
                            <Card.Body>
                                <Row>
                                    <Col xs={8}>
                                        <h2 className="text-center mb-4">Profile</h2>
                                    </Col>
                                    <Col xs={4}>
                                        <Avatar />
                                    </Col>
                                </Row>
                                <Row>
                                    <div className="row"><div className="column1"><strong>Name:</strong></div><div className="column2">{pb.authStore.model?.name}</div></div>
                                    <div className="row"><div className="column1"><strong>Email:</strong></div><div className="column2">{pb.authStore.model?.email}</div></div>
                                    <div className="row"><div className="column1"><strong>Role: </strong></div><div className="column2">{pb.authStore.model?.role}</div></div>
                                    {pb.authStore.model?.settings != null && Object.keys(pb.authStore.model?.settings).length > 0 && <>
                                        <div className="row"><div className="column1"><strong>settings info:</strong></div><div className="column2"></div></div>
                                        {Object.keys(pb.authStore.model.settings).map((key, index) => <div key={index} className="row"><div className="column1"><strong>{key}:</strong></div><div className="column3">{pb.authStore.model.settings[key]}</div></div>)}
                                    </>
                                    }
                                    <div className="mx-auto" style={{ marginTop: "10px", width: '200px' }}>
                                        <Link to="/update-profile" className="btn btn-primary w-100">Update Profile</Link>
                                    </div>
                                </Row>
                            </Card.Body>
                        </Card>
                        <div className="w-100 text-center mt-2">
                            <Button variant="link" onClick={() => navigate('/Logout')}>Log Out</Button>
                        </div>
                    </div>
                </>
                : <Logout />
            }
        </>
    )
}
